/* Catalog web frontend - commons functions to work with known properties

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license: 'please see LICENSE in the top dir.
*/

'use strict';

var knownPropertyValues = {
    identifier: 'identifierLink',
    title: 'titleLabel',
    locator: 'locatorLink',
    creator: 'creatorLabel',
    copyright: ['copyrightLabel', 'holderLabel'],
    policy: ['statementLabel', 'statementLink'],
    collection: 'collectionLabel',
};

/* Remove value attribute from property if propertyName is known.
 *
 */
exports.unsetValue = function(property) {
    if (property.propertyName in knownPropertyValues) {
        delete property.value;
    }
};

/* Generate value attribute for known property.
 *
 */
exports.setValue = function(property) {
    if (property.value) {
        return;
    }

    var propertyName = property.propertyName;
    var propertyAttribute;

    if (propertyName in knownPropertyValues) {
        if (typeof knownPropertyValues[propertyName] === 'string') {
            propertyAttribute = knownPropertyValues[propertyName];

            if (property[propertyAttribute]) {
                property.value = property[propertyAttribute];
            }
            else {
                throw new Error('Value attribute not found for known property: ' + propertyName);
            }
        }
        else {
            for (var i = 0; i < knownPropertyValues[propertyName].length; i++) {
                propertyAttribute = knownPropertyValues[propertyName][i];

                if (property[propertyAttribute]) {
                    property.value = property[propertyAttribute];
                    return;
                }
            }
            throw new Error('Value attributes found for known property: ' + propertyName);
        }
    }
};
