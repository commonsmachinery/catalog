
# Give easy access to the logger accessors in all modules (instead of
# having to set the __future__ stuff) and allow us to later easily
# modify the behaviour of the loggers further.

from __future__ import absolute_import

from celery.utils.log import get_logger
from celery.utils.log import get_task_logger
