
define(function(require){
    var Backbone = require('lib/backbone');
    var util = require('util');

    var Source = Backbone.View.extend({
        binder: new Backbone.ModelBinder,
        initialize: function(model){
            
            this.el = $('#source');
            this.model = model;
            var self = this;
            this.render();

            /* switch to edit mode */
            $('.edit').one('click', function(ev){
                util.editMode(ev, self)
            });
            return;
        },
        render: function(){
            this.binder.bind(this.model, this.el);
            return this;
        }
    });

    return Source
})
