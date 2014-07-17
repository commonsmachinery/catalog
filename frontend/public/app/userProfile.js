/* Catalog web application - user profile
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'lib/backbone', 'util',
        'models/userModel',
        'views/editUserProfileView',
        'views/userProfileView'],
       function($, _, Backbone, util,
                User,
                EditUserProfileView,
                UserProfileView)
{
    'use strict';

    var userModel = null;

    var UserView = Backbone.View.extend({
        initialize: function(){
            this._profileView = new UserProfileView({
                el: this.$el,
                model: userModel
            });

            this.listenToOnce(this._profileView, 'edit:start', this.onEditProfile);
        },

        onEditProfile: function onEditProfile(){
            console.log('editing profile');

            util.emptyViewElement(this._profileView, this);

            this._editProfileView = new EditUserProfileView({
                el: this.$el,
                model: userModel,
                template: '#editUserProfileTemplate'
            }).render();

            this.listenToOnce(this._editProfileView, 'edit:save:success edit:cancel', this.onEditFinish);
        },

        onEditFinish: function onEditFinish(view){
            util.emptyViewElement(this._editProfileView, this);

            this._profileView = new UserProfileView({
                el: this.$el,
                model: userModel,
                template: '#userProfileTemplate'
            });
            
            this.$el.html(this._profileView.render().$el.html());

            this.listenToOnce(this._profileView, 'edit:start', this.onEditProfile);
        },
    });

    return function userProfile(router) {

        var data = util.bootstrapData();

        // userModel is used to populate edit views and update the resulting view
        userModel = new User(data);

        var userView = new UserView({  // jshint ignore:line
            el: '#userProfile',
            model: userModel
        });

    };
});
