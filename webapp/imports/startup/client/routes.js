import { Random } from 'meteor/random';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';

import '../../ui/pages/';

FlowRouter.route('/', {
  name: 'home',
  action() {
    BlazeLayout.render('layout', { main: 'home' });
  },
});

FlowRouter.route('/admin', {
  name: 'adminActions',
  action() {
    BlazeLayout.render('layout', { main: 'adminActions' });
  },
});

FlowRouter.route('/job/new', {
  name: 'newJob',
  triggersEnter: [(context, redirect) => {
    redirect(`/job/${Random.id()}`);
  }],
});

FlowRouter.route('/job/:_publicId', {
  name: 'jobHome',
  action({ _publicId }) {
    Meteor.call('job:getOrCreate', { _publicId }, () => BlazeLayout.render('layout', { main: 'jobHome' }));
  },
});
