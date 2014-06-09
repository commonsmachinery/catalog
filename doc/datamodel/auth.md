
Auth datamodel
==============

The auth module stores all potentially sensitive information about
authorization and authentication, e.g. non-public email addresses,
access tokens or password hashes.

No such information should be stored in the other data models,
allowing security measures to focus on this particular one.


UserAccess
----------

Link a `core.User` to one or more email addresses used for account
identification and communication, and other functions related to user
access.

### Properties

`_id`: The `core.User._id` (sharing the ObjectID).
`emails`: List of email addresses.
`locked`: True if the account is locked.
`locked_by`: The `SiteAdmin.username` which locked the user.
`locked_at`: Date when account was locked.
`lock_reason`: Why the account was locked.

### Index

`emails` (unique): Lookup user based on email


SiteAdmin
---------

Site administrators can lock and unlock users, and may also see all
data in the catalog regardless of access rights.  To manipulate data
in the catalog, they must generate a one-off token for the object
linked to their catalog account and then access via that to get a
proper audit log.

### Properties

`username`: Name used to log in to the catalog.

`password_hash`: Hashed password.

`password_salt`: Salt used when hashing password.

`permissions`: List of permissions this user has. 

`locked`: True if the account is locked.

`core_user`: `core.User._id`, if the site admin has a core `User`
account.

### Index

`username`: On login.

### Permissions

Site admins can have different permissions:

- `*`: Can do anything.
- `admin_admins`: Create, lock and unlock admin accounts.
- `lock_user`, `unlock_user`: Lock or unlock users.
- `access_core:read`, `access_core:write`, `access_core:admin`:
  generate access tokens with the corresponding access level (or
  lower)


AccessToken
-----------

A single-use access token to a single core object.

### Properties

`token`: Generated token.

`valid_until`: Date when the token is no longer valid.

`user`: The `core.User._id` granted access via this token.

`object_type`: The type of core object.

`object_id`: The ID of the core object.

`access`: Type of access, one of `read`, `write` or `admin`.

### Index

`token` (hash): Token lookup.

`valid_until`: Used to garbage collect stale tokens.
