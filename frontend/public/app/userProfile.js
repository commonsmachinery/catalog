/* Catalog web application - user profile
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'lib/backbone', 'util',
    'models/userModel',
    'views/editUserProfileView',
    'views/userProfileView'],
   function($, Backbone, util,
            User,
            EditUserProfileView,
            UserProfileView)
{
    'use strict';

    var UserView = Backbone.View.extend({
        initialize: function(){
            // just bind action events, but not render yet
            this._profileView = new UserProfileView({
                el: this.$('#userProfile'),
                model: this.model
            });
            this.listenToOnce(this._profileView, 'edit:start', this.onEditStart);
        },

        onEditStart: function onEditStart(){
            console.log('editing profile');

            // remove listeners from/to this view and empty container
            util.emptyViewElement(this._profileView, this);

            this._editProfileView = new EditUserProfileView({
                el: this.$('#userProfile'),
                model: this.model,
                template: '#editUserProfileTemplate'
            }).render();

            this.listenToOnce(this._editProfileView, 'edit:save:success edit:cancel', this.onEditFinish);
        },

        onEditFinish: function onEditFinish(){
            util.emptyViewElement(this._editProfileView, this);

            this._profileView = new UserProfileView({
                el: this.$('#userProfile'),
                model: this.model,
                template: '#userProfileTemplate'
            }).render();

            this.listenToOnce(this._profileView, 'edit:start', this.onEditStart);
        },
    });

    return function userProfile(router) {

        var data = util.bootstrapData();

        var userView = new UserView({  // jshint ignore:line
            el: '#user',
            model: new User(data)
        });

    };
});
