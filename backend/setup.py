# -*- coding: utf-8 -*-
#
# backend - query/update graphs for the Commons Machinery metadata catalog
#
# Copyright 2014 Commons Machinery http://commonsmachinery.se/
#
# Authors: Artem Popov <artfwo@commonsmachinery.se>
#
# Distributed under an AGPLv3 license, please see LICENSE in the top dir.

from setuptools import setup

setup(
    name='catalog_backend',
    author='Commons Machinery',
    author_email='dev@commonsmachinery.se',
    version='0.1',
    py_modules=['catalog_backend'],
    packages=['catalog'],
    include_package_data=True,
    license='AGPLv3',
)
