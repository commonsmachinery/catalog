//- Catalog web - model for a user
//-
//- Copyright 2014 Commons Machinery http://commonsmachinery.se/
//- Distributed under an AGPL_v3 license, please see LICENSE in the top dir.

define(['lib/backbone'], function(Backbone) {
    'use strict'; 

    var Profile = Backbone.Model.extend({
        validate: function(){ 
            var attrs = this.attributes;
            var invalid = [];
            var alias = attrs.alias;
            if (alias && !/^[\w-]*$/.test(alias)){
                invalid.push('Invalid alias: valid characters are A-Z, a-z, 0-0, -_.');
            }

            var email = attrs.email;
            if (email && !/^[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(email)){
                invalid.push('Invalid email.');
            }

            var website = attrs.website;
            if (website && !/^(?:http|https)\:\/\/(?:www\.)?(?:\w[\w-]*[\w]\.)+[\w]+[\/#?]?(\x00-\x80)*/.test(website)){
                invalid.push('Invalid website');
            }

            if (invalid.length){
                this.trigger('invalid', invalid);
                return invalid;
            }
        },

        save: function(attrs, callback){
            if(this.isValid()){
                this.parent.save(attrs, callback);
            }
        }

    });

    var User = Backbone.Model.extend({
        urlRoot: '/users',

        initialize: function() {
            var self = this;
            this.profile = this.attributes.profile = new Profile(this.attributes.profile);
            this.profile.parent = this;
        }

    });
    return User;
});
