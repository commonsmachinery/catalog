//- Catalog web - model for a user
//-
//- Copyright 2014 Commons Machinery http://commonsmachinery.se/
//- Distributed under an AGPL_v3 license, please see LICENSE in the top dir.

define(['lib/backbone', 'util'], function(Backbone, util) {
    'use strict'; 

    var Profile = Backbone.Model.extend({
        validate: function(){ 
            var attrs = this.attributes;
            var invalid = [];
            var val;
            var err;

            val = attrs.email;
            err = util.isInvalid('email', val);
            if (val && err){
                invalid.push('Invalid email: ' + err );
            }

            val = attrs.website;
            err = util.isInvalid('url', val);
            if (val && err){
                invalid.push('Invalid website: ' + err);
            }

            val = attrs.gravatar_email;
            err = util.isInvalid('email', val);
            if (val && err){
                invalid.push('Invalid gravatar email: ' + err);
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
        },

        validate: function(){
            var attrs = this.attributes;
            var invalid = [];
            var val;
            var err;

            val = attrs.alias;
            err = util.isInvalid('alphanum');
            if (val && err){
                invalid.push('Invalid alias: ' + err);
            }
            if(invalid.length){
                this.trigger('invalid', invalid);
                return invalid;
            }
        }

    });
    return User;
});
