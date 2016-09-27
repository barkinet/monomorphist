import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { check, Match } from 'meteor/check';
import { Job } from 'meteor/vsivsi:job-collection';

import dedent from 'dedent-js';
import Jobs from '/imports/api/jobs/collection';
import Logs from '/imports/api/logs/collection';
import Nodes from '/imports/api/nodes/collection';
import Queue from '/imports/api/queue/collection';
import Checks from '/imports/checks';

Meteor.methods({
  'job:getOrCreate'(selector) {
    check(selector, Match.ObjectIncluding({ _publicId: Checks.Id })); // eslint-disable-line new-cap
    if (!Jobs.findOne(selector)) {
      const defaultNodes = Nodes.find({ disabled: false, enabledByDefault: true }).fetch();
      const job = _.extend(selector, { nodes: _.pluck(defaultNodes, '_id') });
      Jobs.insert(job);
    }
  },
  'job:addNode'(_publicId, nodeId) {
    check(_publicId, Checks.Id);
    check(nodeId, Checks.Id);
    Jobs.update({ _publicId }, { $addToSet: { nodes: nodeId } });
  },
  'job:removeNode'(_publicId, nodeId) {
    check(_publicId, Checks.Id);
    check(nodeId, Checks.Id);
    Jobs.update({ _publicId }, { $pull: { nodes: nodeId } });
  },
  'job:instrument'(p, screen = true) {
    check(p, Match.OneOf(Checks.Id, Object)); // eslint-disable-line new-cap
    const fn = typeof p === 'string' ? Jobs.findOne({ _publicId: p }).fn : p;
    if (!fn) return '';
    const strictLine = fn.strict ? `'use strict';\n` : '';
    const boilerplate = screen ? '' : dedent`
    function printStatus(fn) {
      switch(%GetOptimizationStatus(fn)) {
        case 1: console.log("Function is optimized (OptimizationStatus {1})"); break;
        case 2: console.log("Function is not optimized (OptimizationStatus {2})"); break;
        case 3: console.log("Function is always optimized (OptimizationStatus {3})"); break;
        case 4: console.log("Function is never optimized (OptimizationStatus {4})"); break;
        case 6: console.log("Function is maybe deoptimized (OptimizationStatus {6})"); break;
        case 7: console.log("Function is optimized by TurboFan (OptimizationStatus {7})"); break;
        default: console.log("Unknown optimization status (OptimizationStatus {0})"); break;
      }
    }

    `;

    return dedent`
    ${strictLine}${boilerplate}${fn.definition}

    ${fn.call}
    ${fn.call}

    %OptimizeFunctionOnNextCall(${fn.name});

    ${fn.call}

    printStatus(${fn.name});`;
  },
  'job:submit'(_publicId) {
    check(_publicId, Checks.Id);
    const job = Jobs.findOne({ _publicId });
    if (!job) return;

    Jobs.update({ _id: job._id, status: 'editing' }, { $set: { status: 'ready' } });
    const queuedJob = new Job(Queue, 'run', { _jobId: job._id, nodes: job.nodes, listed: job.listed });
    queuedJob.priority('normal').save();
    Logs.insert({ _jobId: job._id, time: new Date(), message: 'job queued...' });
  },
  'jobs:total'() {
    return Jobs.find({}).count();
  },
  'jobs:done'() {
    return Jobs.find({ status: 'done' }).count();
  },
  'jobs:killed'() {
    return Jobs.find({ killed: true }).count();
  },
  'jobs:ready'() {
    return Jobs.find({ status: 'ready' }).count();
  },
  'jobs:running'() {
    return Jobs.find({ status: 'running' }).count();
  },
});
