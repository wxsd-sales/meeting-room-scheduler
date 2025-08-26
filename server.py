#!/usr/bin/env python
import base64
import os
import json
import pytz
import traceback

from aws_requests_auth.aws_auth import AWSRequestsAuth
from datetime import datetime, timedelta
from uuid import uuid4


import tornado.gen
import tornado.httpserver
import tornado.ioloop
import tornado.web

from settings import Settings
from spark import Spark
from handlers.base import BaseHandler
from handlers.qr import QRHandler
from handlers.oauth import WebexOAuthHandler

#from tornado import queues
from tornado.options import define, options, parse_command_line
from tornado.httpclient import HTTPError#, AsyncHTTPClient, HTTPRequest

define("debug", default=False, help="run in debug mode")

class LogoutHandler(BaseHandler):
    @tornado.web.asynchronous
    @tornado.gen.coroutine
    def get(self):
        try:
            print("LogoutHandler GET")
            print(self.request.full_url())
            return_to = self.get_argument('returnTo', "")
            print('return_to:{0}'.format(return_to))
            if return_to == "fedramp":
                fedramp_person = self.get_current_user('fedramp')
                if fedramp_person:
                    print('deleting fedramp person')
                    self.delete_current_user('fedramp')
                    #print(fedramp_person.get('emails')[0])
                    redirect_to = "https://idbroker-f.webex.com/idb/saml2/jsp/doSSO.jsp?type=logout"#&email={0}".format(fedramp_person.get('emails')[0])
                    self.redirect(redirect_to)
                else:
                    self.redirect_page('/{0}?'.format(return_to))
            else:
                person = self.get_current_user()
                if person:
                    print('deleting commercial person')
                    self.delete_current_user()
                self.redirect_page('/{0}?'.format(return_to))
            
        except Exception as e:
            traceback.print_exc()

class AuthFailedHandler(BaseHandler):
    @tornado.web.asynchronous
    @tornado.gen.coroutine
    def get(self):
        try:
            print("AuthFailedHandler GET")
            self.render("authentication-failed.html")
        except Exception as e:
            traceback.print_exc()

class InvalidMeetingHandler(BaseHandler):
    @tornado.web.asynchronous
    @tornado.gen.coroutine
    def get(self):
        try:
            print("InvalidMeetingHandler GET")
            self.render("invalid.html")
        except Exception as e:
            traceback.print_exc()

class MainHandler(BaseHandler):
    @tornado.web.asynchronous
    @tornado.gen.coroutine
    def get(self):
        yield self.get_handler()


class CommandHandler(BaseHandler):

    @tornado.gen.coroutine
    def post(self):
        print("CommandHandler request.body:{0}".format(self.request.body))
        jbody = json.loads(self.request.body)
        command = jbody.get('command',"")
        environment = jbody.get('environment',"")
        person = self.get_current_user(environment)
        print("CommandHandler, person: {0}".format(person))
        result_object = {"reason":None, "code":200, "data":None}
        if not person:
            result_object['reason'] = 'Not Authenticated with Webex.'
            result_object['code'] = 401
        else:
            #user = self.application.settings['db'].get_user(person['id'])
            if not self.is_allowed(person): #and user == None:
                result_object['reason'] = 'Not Authenticated.'
                result_object['code'] = 403
            elif command not in ['start_meeting', 'email']:
                result_object['reason'] = "{0} command not recognized.".format(command)
                result_object['code'] = 400
            else:
                result = None
                try:
                    start_time = jbody.get('start_time')
                    duration = jbody.get('duration')
                    timezone = jbody.get('timezone')
                    start_date, end_date = self.get_dates(start_time, duration, timezone)
                    if command == 'start_meeting':
                        success, data = yield self.start_meeting(person, environment, start_date, end_date)
                        if not success:
                            result_object.update(data)
                        else:
                            result = data
                except HTTPError as he:
                    traceback.print_exc()
                    result_object['reason'] = he.response.reason
                    result_object['code'] = he.code
                if result != None:
                    result_object["data"] = result
        res_val = json.dumps(result_object)
        print(res_val)
        self.set_header("Content-Type", "application/json")
        self.write(res_val)

    def get_mtg_urls(self, environment=""):
        talk_url = "https://instant.webex.com/hc/v1/talk?"
        mtg_broker_url = "https://mtg-broker-a.wbx2.com/api/v2"
        # if environment == "fedramp":
        #     talk_url = "https://instant-usgov.webex.com/hc/v1/talk?"
        #     mtg_broker_url = "https://mtg-broker.gov.ciscospark.com/api/v1"
        print('mtg_broker_url:{0}'.format(mtg_broker_url))
        print('talk_url:{0}'.format(talk_url))
        return mtg_broker_url, talk_url


    def get_start_date(self, start_time, timezone):
        start_date = datetime.strptime(start_time, '%m/%d/%Y %H:%M')
        print(start_date.timestamp())
        pytimezone = pytz.timezone(timezone)
        start_date = pytimezone.localize(start_date).astimezone(pytz.timezone('UTC'))
        print('start_date:{0}'.format(start_date))
        return start_date

    def get_end_date(self, start_date, duration):
        end_date = start_date + timedelta(minutes=duration)
        print('end_date:{0}'.format(end_date))
        return end_date

    def get_dates(self, start_time, duration, timezone):
        start_date = self.get_start_date(start_time, timezone)
        end_date = self.get_end_date(start_date, duration)
        return start_date, end_date


    @tornado.gen.coroutine
    def start_meeting(self, person, environment, start_date, end_date):
        mtg_broker_url, talk_url = self.get_mtg_urls(environment)
        success = False
        result = {'reason':"Unable to Encrypt Data", 'code':400}
        userSpark = Spark(person["token"])
        jose_url = '{0}/joseencrypt'.format(mtg_broker_url)
        jwt_dict = {"sub": uuid4().hex, 'nbf':int(start_date.timestamp()), 'exp':int(end_date.timestamp())}
        print('jwt_dict:{0}'.format(jwt_dict))
        #payload = { "aud": Settings.aud, "jwt": jwt_dict, "provideShortUrls": True, "loginUrlForHost": False, "numGuest": 1, "numHost": 1,}
        payload = { "aud": Settings.aud, "jwt": jwt_dict, "provideShortUrls": True}
        jose_resp = yield userSpark.post_with_retries(jose_url, payload)
        print("start_meeting - jose_resp:{0}".format(jose_resp.body))
        host_data = jose_resp.body.get("host", [None])[0].get("short")
        guest_data = jose_resp.body.get("guest", [None])[0].get("short")
        base_url = jose_resp.body.get("baseUrl")
        host_url = base_url + host_data
        guest_url = base_url + guest_data
        result = {"host_url" :host_url, "guest_url": guest_url}
        success = True
        raise tornado.gen.Return((success, result))



@tornado.gen.coroutine
def main():
    try:
        parse_command_line()
        app = tornado.web.Application([
                (r"/", MainHandler),
                (r"/command", CommandHandler),
                (r"/webex-oauth", WebexOAuthHandler),
                (r"/authentication-failed", AuthFailedHandler),
                (r"/invalid", InvalidMeetingHandler),
                (r"/qr", QRHandler),
                (r"/logout", LogoutHandler)
              ],
            template_path=os.path.join(os.path.dirname(__file__), "html_templates"),
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            cookie_secret=Settings.cookie_secret,
            xsrf_cookies=False,
            debug=options.debug,
            )
        server = tornado.httpserver.HTTPServer(app)
        server.bind(Settings.port)
        print("main - Serving... on port {0}".format(Settings.port))
        server.start()
        tornado.ioloop.IOLoop.instance().start()
    except Exception as e:
        traceback.print_exc()

if __name__ == "__main__":
    main()
