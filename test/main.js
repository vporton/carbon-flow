"strict";

const { deployments } = require("@nomiclabs/buidler");
const chai = require("chai");
const chaiAsPromised = require('chai-as-promised');
const mainTest = require('../lib/main-test.js');;

chai.use(chaiAsPromised);

describe("Main test", function() {
  // beforeEach(async () => {
  //   console.log("Deploy the official contracts...");
  //   // await deployments.run(["Carbon"], { writeDeploymentsToFiles: false });
  //   await deployments.fixture();
  // });
  it("Accordingly to the tech specification", async function() {
    this.timeout(60*1000*100);

    await mainTest(chai, deployments, 100);

    // TODO: Also test revert retiring more M- that we have.
  });
});
