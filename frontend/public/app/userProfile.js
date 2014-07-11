/* Catalog web application - user profile
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'lib/backbone', 'util',
        'lib/Backbone.stickit',
        'models/userModel',
        'views/EditUserProfileView'],
       function($, _, Backbone, util,
                stickit,
                User,
                EditUserProfileView)
{
    'use strict';

    var hub = _.extend({}, Backbone.Events);
    var userModel = null;

    var UserProfileView = Backbone.View.extend({
        events: {
            'click [data-action="edit-profile"]': "onEditProfile" 
        },

        initialize: function() {
            this.delegateEvents();
        },

        render: function() {
            this.stickit();
        },

        onEditProfile: function onEditProfile(){
            this.trigger('edit:start');
        }
    });

    var UserView = Backbone.View.extend({
        initialize: function(){
            this._profileView = new UserProfileView({
                el: this.el,
                model: userModel
            });

            this.listenTo(this._profileView, 'edit:start', this.onEditProfile);
        },

        onEditProfile: function onEditProfile(){
            console.log('editing profile');

            util.emptyViewElement(this._profileView, this);

            this._editProfileView = new EditUserProfileView({
                el: this.$el.html($('#editUserProfileTemplate').html()),
                model: userModel.profile
            });
            this.$el.append(this._editProfileView.render().el);

            this.listenTo(this._editProfileView, 'edit:save:success edit:save:error edit:cancel', this.onEditFinish);
        },

        onEditFinish: function onEditFinish(view){
            util.emptyViewElement(this._editProfileView, this);

            this._profileView = new UserProfileView({
                el: this.$el,
                model: userModel
            });
        },
    });

    return function browseWorks(router) {

        var data = util.bootstrapData();

        // userModel is used to populate edit views and update the resulting view
        userModel = new User(data);

        var userView = new UserView({ 
            el: '#userProfile',
            model: userModel
        });

    };
});
