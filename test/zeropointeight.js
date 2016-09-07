/* eslint-env node, mocha */

const raml2obj = require('..');
const assert = require('assert');

describe('raml2obj', () => {
  it('should not support 0.8 files at all', (done) => {
    raml2obj.parse('test/zeropointeight.raml').then(null, (error) => {
      assert.equal(error.message, '_sourceToRamlObj: only RAML 1.0 is supported!');
      done();
    });
  });
});
