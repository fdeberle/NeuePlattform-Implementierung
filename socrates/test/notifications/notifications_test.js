'use strict';

var sinon = require('sinon').sandbox.create();
var expect = require('must-dist');

var beans = require('../../testutil/configureForTest').get('beans');
var notifications = beans.get('socratesNotifications');

var memberstore = beans.get('memberstore');
var membersService = beans.get('socratesMembersService');
var subscriberstore = beans.get('subscriberstore');

var Member = beans.get('member');
var transport = beans.get('mailtransport');
var roomOptions = beans.get('roomOptions');
var supermanEmail = 'superman@email.de';

var hans = new Member({
  id: 'hans',
  firstname: 'Hans',
  lastname: 'Dampf',
  email: 'hans@email.de',
  nickname: 'Gassenhauer'
});

describe('Notifications', function () {
  var stubOrganizers = function (emailAdresses) {
    sinon.stub(membersService, 'registrationNotificationEmailAddresses',
      function (callback) { callback(null, emailAdresses); });
  };

  beforeEach(function () {
    sinon.stub(transport, 'sendMail');
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('for new members', function () {
    it('creates a meaningful text and subject', function () {
      stubOrganizers([supermanEmail]);
      sinon.stub(subscriberstore, 'allSubscribers', function (callback) { callback(null, ['p1', 'p2', 'p3']); });

      notifications.newSoCraTesMemberRegistered(hans);
      expect(transport.sendMail.calledOnce).to.be(true);
      var options = transport.sendMail.firstCall.args[0];
      expect(options.subject).to.equal('Neuer Interessent');
      expect(options.html).to.contain('Es hat sich ein neuer SoCraTes-Interessent registriert:');
      expect(options.html).to.contain('Hans Dampf');
      expect(options.html).to.contain('/members/Gassenhauer');
      expect(options.html).to.contain('hans@email.de');
      expect(options.html).to.contain('Damit hat die SoCraTes jetzt 3 Interessenten.');
    });

    it('triggers mail sending for superusers', function () {
      stubOrganizers([supermanEmail]);
      sinon.stub(subscriberstore, 'allSubscribers', function (callback) { callback(null, ['p1', 'p2', 'p3']); });

      notifications.newSoCraTesMemberRegistered(hans);
      expect(transport.sendMail.calledOnce).to.be(true);
      var options = transport.sendMail.firstCall.args[0];
      expect(options.bcc).to.contain(supermanEmail);
      expect(options.bcc).to.not.contain('hans@email.de');
      expect(options.bcc).to.not.contain('alice@email.de');
      expect(options.bcc).to.not.contain('bob@email.de');
      expect(options.from).to.contain('Softwerkskammer Benachrichtigungen');
    });

    it('does not trigger mail sending if there are no concerned parties', function () {
      stubOrganizers([]);
      sinon.stub(subscriberstore, 'allSubscribers', function (callback) { callback(null, ['p1', 'p2', 'p3']); });

      notifications.newSoCraTesMemberRegistered(hans);
      expect(transport.sendMail.called).to.be(false);
    });
  });

  describe('for participation', function () {
    it('creates a meaningful text and subject for immediate registrants', function () {
      sinon.stub(memberstore, 'getMemberForId', function (id, callback) { callback(null, hans); });
      stubOrganizers([]);

      notifications.newParticipant(hans, roomOptions.informationFor('junior', 3));
      expect(transport.sendMail.calledOnce).to.be(true);
      var options = transport.sendMail.firstCall.args[0];
      expect(options.subject).to.equal('SoCraTes Registration Confirmation');
      expect(options.html).to.contain('junior room (exclusively)');
      expect(options.html).to.contain('<b>3</b>  nights');
      expect(options.html).to.not.contain('If you want to stay longer, please tell us by replying to this e-mail');
    });

    it('creates a meaningful text and subject for registrants coming from the waitinglist', function () {
      sinon.stub(memberstore, 'getMemberForId', function (id, callback) { callback(null, hans); });
      stubOrganizers([]);

      var bookingdetails = roomOptions.informationFor('junior', 3);
      bookingdetails.fromWaitinglist = true;
      notifications.newParticipant(hans, bookingdetails);
      expect(transport.sendMail.calledOnce).to.be(true);
      var options = transport.sendMail.firstCall.args[0];
      expect(options.subject).to.equal('SoCraTes Registration Confirmation');
      expect(options.html).to.contain('If you want to stay longer, please tell us in your reply');
    });

    it('sends a meaningful mail to superusers', function () {
      sinon.stub(memberstore, 'getMemberForId', function (id, callback) { callback(null, hans); });
      stubOrganizers([supermanEmail]);

      notifications.newParticipant(hans, roomOptions.informationFor('junior', 3));
      expect(transport.sendMail.calledTwice).to.be(true);
      var options = transport.sendMail.secondCall.args[0];
      expect(options.bcc).to.contain(supermanEmail);
      expect(options.subject).to.equal('New SoCraTes Registration');
      expect(options.html).to.contain('junior room (exclusively)');
      expect(options.html).to.contain('<b>3</b>  nights');
      expect(options.html).to.contain('Gassenhauer');
    });
  });

  describe('for waitinglist', function () {
    it('creates a meaningful text and subject', function () {
      sinon.stub(memberstore, 'getMemberForId', function (id, callback) { callback(null, hans); });
      stubOrganizers([]);

      notifications.newWaitinglistEntry(hans, [roomOptions.informationFor('junior', 3)]);
      expect(transport.sendMail.calledOnce).to.be(true);
      var options = transport.sendMail.firstCall.args[0];
      expect(options.subject).to.equal('SoCraTes Waitinglist Confirmation');
      expect(options.html).to.contain('junior room (exclusively)');
    });

    it('sends a meaningful mail to members concerned with registration', function () {
      sinon.stub(memberstore, 'getMemberForId', function (id, callback) { callback(null, hans); });
      stubOrganizers([supermanEmail]);

      notifications.newWaitinglistEntry(hans, [roomOptions.informationFor('junior', 3)]);
      expect(transport.sendMail.calledTwice).to.be(true);
      var options = transport.sendMail.secondCall.args[0];
      expect(options.bcc).to.contain(supermanEmail);
      expect(options.subject).to.equal('New SoCraTes Waitinglist Entry');
      expect(options.html).to.contain('junior room (exclusively)');
      expect(options.html).to.contain('Gassenhauer');
    });
  });

});
