#! /usr/bin/env python3
#
# Query elog.io by image URL given in the command line.
# Run the script like following:
#
# python3 elogio.py http://upload.wikimedia.org/wikipedia/commons/9/97/Ciuffenna02.jpg


import sys
import argparse
import urllib.request, urllib.parse, urllib.error
import json

BASEURL = "http://catalog.elog.io"

parser = argparse.ArgumentParser(description='Get image information from elog.io.')
parser.add_argument('url', metavar='URL', type=str,
                   help='An image URL to query')

args = parser.parse_args()
img_url = args.url

params = urllib.parse.urlencode({'uri': img_url})
url = BASEURL + "/lookup/uri?%s" % params

# search for work by URI
try:
    req = urllib.request.Request(url)
    req.add_header('Accept', 'application/json')
    res = urllib.request.urlopen(req).read().decode('utf-8')
except urllib.urlerror.URLError as err:
    print('Image lookup error: {0}'.format(err))
    sys.exit(1)

results = json.loads(res)

for r in results:
    href = r['href']

    print('Found matching work at {0}'.format(href))

    try:
        req = urllib.request.Request(href)
        req.add_header('Accept', 'application/json')
        res = urllib.request.urlopen(req).read().decode('utf-8')
    except urllib.urlerror.URLError as err:
        print('Error getting work data: {0}'.format(err))
        sys.exit(1)

    work = json.loads(res)
    annotations = work['annotations']

    for a in annotations:
        p = a['property']
        name = p['propertyName']
        value = p['value']

        print("Property: {0}. Value: {1}".format(name, value))
    print()
