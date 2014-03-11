
define(function(require){

	var Backbone = require('lib/backbone');
	var Post = Backbone.Model.extend({
		changesMade: '0',
		defaults: {
			metadata: '{\n\t"testMeta": "meta meta"\n}'
		},
		initialize: function(){
			var self = this;
			this.on('change', function(){
				self.changesMade++;
			});
			return;
		}
	});
	return Post;
})