var nodemailer = require("nodemailer");
var Preferences = require('./../config/Preferences.js');

var Utility = {
	smtpTransport: function() {
		return nodemailer.createTransport("SMTP", {
			service: Preferences.mail.service,
			auth: {
				user: Preferences.mail.user,
				pass: Preferences.mail.pass
			}
		});
	},
	sendSingleMail: function(options, callback) {
		var smtpTransport = Utility.smtpTransport();
		var mailOptions = {
			from: "Wesleyan Spec <wesleyanspec@gmail.com>",
			subject: options.subject,
			html: options.html,
			to: options.to
		};

		smtpTransport.sendMail(mailOptions, function(error, response) {
			if (error) {
				console.log(error);
			} else {
				if (typeof callback === 'function') {
					callback(response);
				}
			}
		});
		smtpTransport.close();
	},
	fullShiftNumber: function(event) {
		var fullShifts = 0;
		for (var i = 0; i < event.shifts.length; i++) {
			if (event.shifts[i].staff !== '') {
				fullShifts++;
			}
		}
		return fullShifts;
	},
	addBackgroundColor: function(events) { //changes the events object
		for (index = 0; index < events.length; ++index) {
			event = events[index];
			if (event.techMustStay == false) {
				events[index]['className'] = ['striped']; //handles the setup and breakdown events as well
			}
			if (event.cancelled == true) {
				events[index]['backgroundColor'] = Preferences.backgroundColors.gray;
			} else if (Utility.fullShiftNumber(event) == 0) {
				events[index]['backgroundColor'] = Preferences.backgroundColors.red;
			} else if (Utility.fullShiftNumber(event) < event.staffNeeded) {
				events[index]['backgroundColor'] = Preferences.backgroundColors.yellow;
			} else if (Utility.fullShiftNumber(event) == event.staffNeeded) {
				events[index]['backgroundColor'] = Preferences.backgroundColors.green;
			}
		}
		return events;
	}
};

module.exports = Utility;