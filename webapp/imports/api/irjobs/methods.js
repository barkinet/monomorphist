import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Job } from 'meteor/vsivsi:job-collection';

import IRJobs from '/imports/api/irjobs/collection';
import Logs from '/imports/api/logs/collection';
import { Queue } from '/imports/api/queue/collection';
import Checks from '/imports/checks';

Meteor.methods({
  'irjob:getOrCreate'(selector) {
    check(selector, Match.ObjectIncluding({ _publicId: Checks.Id })); // eslint-disable-line new-cap
    if (!IRJobs.findOne(selector)) {
      IRJobs.insert(selector);
    }
  },
  'irjob:submit'(_publicId) {
    check(_publicId, Checks.Id);
    const irjob = IRJobs.findOne({ _publicId, status: 'editing' });
    if (!irjob || !irjob.v8) return;
    IRJobs.update({ _id: irjob._id, status: 'editing' }, { $set: { status: 'ready' } });
    const queuedJob = new Job(Queue, 'run-ir', { _irjobId: irjob._id, v8: irjob.v8, listed: irjob.listed });
    queuedJob.priority('normal').save();
    Logs.insert({ _irjobId: irjob._id, time: new Date(), message: 'irjob queued...' });
  },
  'irjobs:total'() {
    return IRJobs.find({ updatedAt: { $exists: true } }).count();
  },
  'irjobs:done'() {
    return IRJobs.find({ status: 'done' }).count();
  },
  'irjobs:killed'() {
    return IRJobs.find({ killed: true }).count();
  },
  'irjobs:ready'() {
    return IRJobs.find({ status: 'ready' }).count();
  },
  'irjobs:running'() {
    return IRJobs.find({ status: 'running' }).count();
  },
});