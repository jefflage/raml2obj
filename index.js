#!/usr/bin/env node

'use strict';

const raml = require('raml-1-parser');
const fs = require('fs');

function _parseBaseUri(ramlObj) {
  // I have no clue what kind of variables the RAML spec allows in the baseUri.
  // For now keep it super super simple.
  if (ramlObj.baseUri) {
    ramlObj.baseUri = ramlObj.baseUri.replace('{version}', ramlObj.version);
  }

  return ramlObj;
}

function _makeUniqueId(string) {
  const stringWithSpacesReplaced = string.replace(/\W/g, '_');
  const stringWithLeadingUnderscoreRemoved = stringWithSpacesReplaced.replace(new RegExp('^_+'), '');
  return stringWithLeadingUnderscoreRemoved.toLowerCase();
}

function _traverse(ramlObj, parentUrl, allUriParameters) {
  // Add unique id's and parent URL's plus parent URI parameters to resources
  if (!ramlObj.resources) {
    return ramlObj;
  }

  ramlObj.resources.forEach((resource) => {
    resource.parentUrl = parentUrl || '';
    resource.uniqueId = _makeUniqueId(resource.parentUrl + resource.relativeUri);
    resource.allUriParameters = [];

    if (allUriParameters) {
      resource.allUriParameters.push.apply(resource.allUriParameters, allUriParameters);
    }

    if (resource.uriParameters) {
      Object.keys(resource.uriParameters).forEach((key) => {
        resource.allUriParameters.push(resource.uriParameters[key]);
      });
    }

    if (resource.methods) {
      resource.methods.forEach((method) => {
        method.allUriParameters = resource.allUriParameters;
      });
    }

    _traverse(resource, resource.parentUrl + resource.relativeUri, resource.allUriParameters);
  });

  return ramlObj;
}

function _enhanceRamlObj(ramlObj) {
  ramlObj = _parseBaseUri(ramlObj);
  ramlObj = _traverse(ramlObj);

  // Add extra function for finding a security scheme by name
  ramlObj.securitySchemeWithName = function (name) {
    if (ramlObj.securitySchemes) {
      const result = ramlObj.securitySchemes.find(s => s[name]);
      if (result) {
        return result[name];
      }
    }
    return {};
  };

  // Add unique id's to top level documentation chapters
  if (ramlObj.documentation) {
    ramlObj.documentation.forEach((docSection) => {
      docSection.uniqueId = _makeUniqueId(docSection.title);
    });
  }

  return ramlObj;
}

function _sourceToRamlObj(source) {
  if (typeof source === 'string') {
    if (fs.existsSync(source) || source.indexOf('http') === 0) {
      // Parse as file or url
      return raml.loadApi(source, { rejectOnErrors: true }).then((result) => {
        if (result._node._universe._typedVersion === '0.8') {
          throw new Error('_sourceToRamlObj: only RAML 1.0 is supported!');
        }

        return result.expand().toJSON();
      });
    }

    return new Promise((resolve, reject) => {
      reject(new Error('_sourceToRamlObj: source does not exist.'));
    });
  } else if (typeof source === 'object') {
    // Parse RAML object directly
    return new Promise((resolve) => {
      resolve(source);
    });
  }

  return new Promise((resolve, reject) => {
    reject(new Error('_sourceToRamlObj: You must supply either file, url or object as source.'));
  });
}

module.exports.parse = function (source) {
  return _sourceToRamlObj(source).then((ramlObj) => _enhanceRamlObj(ramlObj));
};
