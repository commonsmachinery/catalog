
Backbone views for the website
==============================

[Schematic overview](https://raw.githubusercontent.com/commonsmachinery/catalog/master/doc/wireframes/siteviews.png)

Pages presenting static, publically consumable information should by
always be served up as a server-side rendered page which doesn't
require any javascript to see the information.  This should make the
read-only site accessible to screen readers and web crawlers.

The static page will not include any embedded information about other
objects (except users and organisations), just a browsable link to the
page for that object.

However, most people will consume these pages in a browser with
javascript, and a number of Backbone views are used to make this
easier for the users.  When loading a page, these views should when
possible just hook up to the server-rendered DOM rather than rendering
new DOM to make page load smooth.  Bootstrapped JSON objects will be
present in the page to aid this.

All editing requires javascript as it will go through Backbone views
and models.

Most pages consist of one or more master views, whose job is primarily
to coordinate a number of subviews.


Common views
============

PagedView
---------

Common multi-page list or grid navigation.  In the scripted version
it will fetch additional pages with REST calls.


UserOverView
------------

Showing a user or organisation gravatar and alias+name on mouse over.
On click, go to User/org profile.


WorkOverView
------------

Show a brief overview of a work: alias, title, description, thumbnail
(if any of them are available).  In some views this may not be shown
directly, but folded out from a work alias or ID.


CollaboratorsView
-----------------

A list of users and groups who collaborate on a work or collection.
Should allow removing these, or adding additional with the subviews
SelectUserView and SelectGroupView.


EventView
---------

All objects with an event history has a common event view which can be
activated to show the list of events.  They are not included in the
static pages.  Though the events are specific to each type of object,
mapping an event to a rendering is a general process so it should not
be necessary with type-specific views.


User profile
============

UserView
--------

Basic user view doesn't do much, but will later include buttons for
social functions etc.


### UserProfileView

Default view, just shows static HTML of the user profile.  On page
load the pre-rendered DOM is used, after editing new DOM is rendered
to replace the edit view.

The gravatar email is never shown, just gravatar itself.

Edit button is included if the user has write permissions.  It causes
the view to send an event to the UserView to switch to
EditUserProfileView.

### EditUserProfileView

Allow user to edit the profile, including the gravatar email.  On
cancel or successful save an event is sent to UserView to switch back
to UserProfileView.

### EditUserAccountView

TODO: this will allow administering emails for login and
communication, social media account access etc.


UserRelationsView
-----------------

Lists of relationships this user has:

- Own works and collaborations (PagedView)
- Own collections and collaborations (plain list?)
- Organisations (owner or group member) (plain list?)


Browse works
============

See also the shared views above.

WorkFilterView
--------------

TODO: specify available filters.

TODO: would it be a good idea to let this start out hidden (not
included in DOM at all), and render it only when it is folded out?

WorkBatchCommandView
--------------------

Batch commands on the lists of works.

TODO: define what the commands are.


Create work
===========

Creating works is done on a fully scripted page, though most of the
DOM can be pre-rendered as there's no need to be dynamic.  There are
tabs for the different ways of creating works, and CreateWorkView just
switches between these views.

When a work has been created the subviews will send an events, which
CreateWorkView will listen to to redirect to the page for the new
work.  Later it could instead just switch out the CreateWorkView and
render a WorkView in place.

WorkFromURLView
---------------

Enter a URL to an online resource.  On submit, the server will respond
with a 202 Accepted and a URL to poll for the completed process of
fetching the URL to create a Work with a linked Media.  The view
should show a progress indicator while checking the poll URL, and
finally switch to the Work page when the process is completed.

ManualCreateWorkView
--------------------

This view allows the user to enter some basic information about the
work, including common annotations such as title and license.
Anything more advanced must be done on the Work page.

UploadWorkView
--------------

Create a work by uploading a file that will become a Media instance.
Like WorkFromURLView, this will have to show a progress symbol while
the file is being uploaded and progressed and continue when the poll
URL says it's ok.


Work
====

WorkView
--------

The main view for the Work model has different subsections:

- Link to parent work (if any)
- Details
- Collaborators
- Annotations
- List of source works
- Add a source
- List of media instances
- Add a media

The main view handles the Delete Work button, if the user has admin
permission.

The main view will also have buttons for forking a work, reporting
abuse, tracking a work etc.


### WorkDetailsView

Statically show alias, description and public flag, including the Edit
button if the user has write permission.  Switches to
EditWorkDetailsView by sending a message to the WorkView.

### EditWorkDetailsView

Allow edigint the alias and description and changing the public flag.
On successful Save or Cancel switches back to the WorkDetailsView by
sending a message to the WorkView.

### AnnotationsListView

A list of all annotations on the work, each as an AnnotationView.
These can be switched to EditAnnotationView and back to change the
information.  AddAnnotationView adds a new annotation to the list.

### AddSourceView

Add a source to the work, using the same views as CreateWorkView
above.  On successful creation, the work is added to the list of
source works.

Another catalog work can be added as a source by its URL.  TODO: but
we probably need a dedicated dialogue to browse for a catalog work to
be added, too?

### AddMediaView

Medias can be added either by URL or by uploading a file.  As when
creating a new work, a progress indicator is shown until all is done
and the media can be added to the list.

TODO: as for AddSourceView, should there be a dedicated view to add the
source of another work?  Or is the URL method enough?


WorkRelationsView
-----------------

This view collections relationship to this work, that is thus not
logically part of the Work model itself.  These are simple lists in
the static display, with folded-out views when scripted:

- List of derivative works (that has this as a source)
- List of forked works
- List of collections this work belongs to

It also allows the user to add this work to a collection.


Media
=====

MediaView
---------

A readonly display, MediaView may not actually be needed.  Same with
the AnnotationListView, unless it has folding/sorting/filtering
functions.

MediaRelationsView
------------------

A list of works that link to this media.  In the static page this is
just a plain list, with included inline WorkOverView in the scripted
page.


Browse collections
==================

TODO


Create Collection
=================

TODO


Collection
==========

TODO


Organisation
============

TODO

