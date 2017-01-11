'use strict';

// blockchain definition

var u = require('bitcoin-util');
var BN = require('bn.js');
var reverse = require('buffer-reverse');
var repeat = require('repeat-string');

// difficulty retarget settings
var interval = 2016;
var targetSpacing = 10 * 60;

// tests whether the difficulty should be changed for this block
function shouldRetarget(block, cb) {
  return cb(null, block.height % this.interval === 0);
}

// calculate the new mining target (called every retarget)
// block is the block currently which we are calculating the target for
// chain is the `Blockchain` object
function calculateTarget(block, chain, cb) {
  var _this = this;

  chain.getBlock(block.header.prevHash, function (err, end) {
    if (err) return cb(err);
    // traverse back to the block from the last retarget
    // this is slow, TODO: index by height for random access
    chain.getBlockAtHeight(block.height - _this.interval, function (err, start) {
      if (err) return cb(err);
      var target = calculateTargetFromInterval.call(_this, chain.maxTarget(), start, end);
      return cb(null, target);
    });
  });
}

function calculateTargetFromInterval(maxTarget, startBlock, endBlock) {
  var targetTimespan = this.interval * this.targetSpacing;
  var timespan = endBlock.header.timestamp - startBlock.header.timestamp;
  timespan = Math.max(timespan, targetTimespan / 4);
  timespan = Math.min(timespan, targetTimespan * 4);

  var target = u.expandTarget(endBlock.header.bits);
  target = new BN(target.toString('hex'), 'hex');
  target.imuln(timespan);
  target.idivn(targetTimespan);

  var maxTargetBN = new BN(maxTarget.toString('hex'), 'hex');
  if (target.cmp(maxTargetBN) === 1) {
    return maxTarget;
  }

  var hex = target.toString('hex');
  hex = repeat('0', 64 - hex.length) + hex;
  target = new Buffer(hex, 'hex');

  return target;
}

// gets the hash of the block header used for mining/proof validation
function miningHash(header, cb) {
  return cb(null, reverse(header.getHash())); // TODO - adjust for bitcore-lib-dash
}

// settings passed to Blockchain objects
// (see https://github.com/mappum/blockchain-spv)
module.exports = {
  // required
  shouldRetarget: shouldRetarget,
  calculateTarget: calculateTarget,
  miningHash: miningHash,

  // these fields not required for blockchain params,
  // but are exposed so other networks can change these fields
  interval: interval,
  targetSpacing: targetSpacing,
  calculateTargetFromInterval: calculateTargetFromInterval
};