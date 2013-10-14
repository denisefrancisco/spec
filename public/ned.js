var Spec = {}; //the only global variable that is supposed to be used in this application.
Spec = { 
	storeAllStaff: [],
	username: 'ckorkut',
	lastClickedEvent: {},
	View: {},
	dropdownActiveFix: function() {
		$('a').removeClass('drop-active');
		$('a[href="#' + Backbone.history.fragment + '"]').addClass('drop-active');
	},
	changePopupColor: function (event) { //changes the events object
		$("#popupTitleButton").removeClass("btn-success btn-inverse btn-warning btn-danger");
		if (event.valid == false) {
			$("#popupTitleButton").addClass("btn-inverse");
		} else if (event.staffAdded == 0) {
			$("#popupTitleButton").addClass("btn-danger");
		} else if (event.staffAdded < event.staffNeeded) {
			$("#popupTitleButton").addClass("btn-warning");
		} else if (event.staffAdded == event.staffNeeded) {
			$("#popupTitleButton").addClass("btn-success");
		}
	},
	resizeMap: function() {
		var column_height = $(window).height();
		$('#calendar').fullCalendar('option', 'height', column_height - 40); //$("#calendar").css("height", + "px")
	}, //end resizeMap
	setTimeline: function(view) { //this is borrowed from stackoverflow
		var parentDiv = jQuery(".fc-agenda-slots:visible").parent();
		var timeline = parentDiv.children(".timeline");
		if (timeline.length == 0) { //if timeline isn't there, add it
			timeline = jQuery("<hr>").addClass("timeline");
			parentDiv.prepend(timeline);
		}
		var curTime = new Date();
		var curCalView = jQuery("#calendar").fullCalendar('getView');
		if (curCalView.visStart < curTime && curCalView.visEnd > curTime) {
			timeline.show();
		} else {
			timeline.hide();
			return;
		}
		var curSeconds = (curTime.getHours() * 60 * 60) + (curTime.getMinutes() * 60) + curTime.getSeconds();
		var percentOfDay = curSeconds / 86400; //24 * 60 * 60 = 86400, # of seconds in a day
		var topLoc = Math.floor(parentDiv.height() * percentOfDay);
		timeline.css("top", topLoc + "px");
		if (curCalView.name == "agendaWeek") { //week view, don't want the timeline to go the whole way across
			var dayCol = jQuery(".fc-today:visible");
			var left = dayCol.position().left + 1;
			var width = dayCol.width() - 2;
			timeline.css({
				left: left + "px",
				width: width + "px"
			});
		}
	}, //end setTimeline
	formatAMPM: function(date) {
	  var hours = date.getHours();
	  var minutes = date.getMinutes();
	  var ampm = hours >= 12 ? 'PM' : 'AM';
	  hours = hours % 12;
	  hours = hours ? hours : 12; // the hour '0' should be '12'
	  minutes = minutes < 10 ? '0'+minutes : minutes;
	  var strTime = hours + ':' + minutes + ' ' + ampm;
	  return strTime;
	}, //end formatAMPM
	_inventoryProto: {
		only_suggestions: true,
		suggestion_url: "inventory/all",
		//These methods below have to send AJAX requests to update the inventory.
		onRemove: function(pill) {
			var id = pill.data('tag-id');
			$.ajax({
				type: "POST",
				url: "inventory/remove",
				data: {
					eventid: Spec.lastClickedEvent['_id'],
					inventoryid:pill.data('tag-id')
				}
			}).done(function(msg) {
				console.log('pill with ID ' + id + ' removed');
			});
		},
		onBeforeAdd: function(pill) { //this also works for initial/on modal click loading.
			//var id = pill.data('tag-id');
			//console.log('initial pill with ID ' + id + ' added');
			return pill; //has to return pill
		},
		onBeforeNewAdd: function(pill) { //this also works for initial/on modal click loading.
			var id = pill.data('tag-id');
			$.ajax({
				type: "POST",
				url: "inventory/add",
				data: {
					eventid: Spec.lastClickedEvent['_id'],
					inventoryid: pill.data('tag-id')
				}
			}).done(function(msg) {
				console.log('pill with ID ' + id + ' added');
			});
			return pill; //has to return pill
		}
	}, //end _inventoryProto
};
//User info must be imported for this part

// BACKBONE.JS ROUTER SECTION
var AppRouter = Backbone.Router.extend({
	routes: {
		"printToday": "printToday",
		"recentVideo": "recentVideo",
		"*filter": "all"
	}
});

Spec.app = new AppRouter;

Spec.app.on('route:printToday', function() {
	console.log('printToday');
});
Spec.app.on('route:recentVideo', function() {
	console.log('recentVideo');
});

Spec.app.on('route:all', function(filter) {
	Spec.dropdownActiveFix();
	if (filter == null) {
		//Show all of events
		$('#calendar').fullCalendar('clientEvents', function(event) {
			event.className = _.without(event.className, 'hide');
			$('#calendar').fullCalendar('updateEvent', event);
		});
		console.log('all');

	} else if (filter == 'hideCancelled') {

		$('#calendar').fullCalendar('clientEvents', function(event) {
			event.className = _.without(event.className, 'hide');
			if (event.valid == false) {
				event.className.push('hide');
			}
			$('#calendar').fullCalendar('updateEvent', event);
		});
		console.log(filter);
	} else if (filter == 'unstaffed') {
		$('#calendar').fullCalendar('clientEvents', function(event) {
			event.className = _.without(event.className, 'hide');
			if (event.staffAdded == event.staffNeeded || event.valid == false) {
				event.className.push('hide');
			}
			$('#calendar').fullCalendar('updateEvent', event);
		});
		console.log(filter);
	} else if (filter == 'onlyMine') {
		$('#calendar').fullCalendar('clientEvents', function(event) {
			event.className = _.without(event.className, 'hide');
			var people = [];
			event.shifts.forEach(function(shift) {
				people.push(shift.staff);
			})
			if (people.indexOf(Spec.username) == -1) {
				event.className.push('hide');
			}
			$('#calendar').fullCalendar('updateEvent', event);
		});
		console.log(filter);
	}
});

Backbone.history.start();

// BACKBONE.JS VIEWS Spec.View.*
_.templateSettings.variable = "op";

Spec.View.Notes = Backbone.View.extend({
        initialize: function(options){
            this.render(options);
            options.notes.forEach(function(note) {
            	var each_note_view = new Spec.View.EachNote(note);
            });
        },
        render: function(options){
            var variables = { eventid: Spec.lastClickedEvent['_id'], notes: options.notes };
            var template = _.template( $("#notes_template").html(), variables );
            $("#notes").html( template );
        }
    });

Spec.View.EachNote = Backbone.View.extend({
        initialize: function(note){
            this.render(note);
            var removedItem;
            $('.removeNote').unbind( "click" );
			$('.removeNote').on('click', function(e) { //this is in Spec.View.EachNote because it should be binded to notes added by user later on too
				removedItem = this;
				var noteid = $(this).attr('href');
				$.ajax({
					type: "POST",
					url: "notes/remove",
					data: {
						'id': noteid,
						eventid: Spec.lastClickedEvent['_id']
					}
				}).done(function(msg) {
					console.log('note removed from event ID ' + Spec.lastClickedEvent.id + ', ID: ' + noteid);
					$(removedItem).parent().parent().remove();
				});
				return false;
			});
        },
        render: function(note){
            var variables = { eventid: Spec.lastClickedEvent['_id'], 'note': note };
            var template = _.template( $("#each_note_template").html(), variables );
            $("#notesBody").append( template );
        }
    });

Spec.View.Staff = Backbone.View.extend({
        initialize: function(options){
            this.render(options);
        },
        render: function(options){
            //Pass variables in using Underscore.js Template
            var variables = {'shifts': options.shifts };
            // Compile the template using underscore
            var template = _.template( $("#staff_template").html(), variables );
            // Load the compiled HTML into the Backbone "el"
            $("#staffEvent .modal-body").html( template );
            options.shifts.forEach(function(shift) {
            	var each_note_view = new Spec.View.EachStaff({ 'item': shift });
            });
            Spec.newRowInit(options.shifts.slice(-1)[0]);
            $('.combobox').combobox({
				placeholder: 'Choose a staff'
			});
        }
    });
Spec.View.EachStaff = Backbone.View.extend({
        initialize: function(options){
            this.render(options);
        },
        render: function(options){
            //Pass variables in using Underscore.js Template
            var variables = {'item': options.item };
            // Compile the template using underscore
            var template = _.template( $("#each_staff_template").html(), variables );
            // Load the compiled HTML into the Backbone "el"
            $("#staffEvent .modal-body tbody").prepend( template );
            $('.removeStaff').on('click', function(e) {
				removedItem = this;
				var shiftid = $(this).attr('href');
				$.ajax({
					type: "POST",
					url: "staff/remove",
					data: {
						'id': shiftid,
						'eventid': Spec.lastClickedEvent['_id']
					}
				}).done(function(msg) {
					console.log('staff removed from event ID ' + Spec.lastClickedEvent['_id'] + ', ID: ' + shiftid);
					$(removedItem).parent().parent().remove();
				});
				return false;
			});
        }
    });

Spec.newRowInit = function (lastShift) {
	if(lastShift == undefined) {
		var startTime = Spec.formatAMPM(Spec.lastClickedEvent.start);
		var endTime = Spec.formatAMPM(Spec.lastClickedEvent.end);
	} else {
		var startTime = Spec.formatAMPM(new Date(Date.parse(lastShift.start)));
		var endTime = Spec.formatAMPM(new Date(Date.parse(lastShift.end)));
	}
 	$('#timepicker5').timepicker({
		template: false,
		showInputs: false,
		minuteStep: 5,
		defaultTime: startTime
	});
	$('#timepicker6').timepicker({
		template: false,
		showInputs: false,
		minuteStep: 5,
		defaultTime: endTime
	});
	$('.combobox').html('');
	Spec.storeAllStaff.forEach(function(person) {
		if(person.name == false) {return;}
		$('.combobox')
			.append($('<option>', {
					'value': person.username
				})
				.text(person.name + ' (' + person.username + ')'));
	});
	$('#addNewStaff').click(function(e) {
		if($('.combobox').val() == '') {
			$.bootstrapGrowl("You must choose a staff to add a valid shift.", {
			  type: 'error',
			  align: 'center',
			  delay: 2000,
			});
			return false;		
		} else {
			var chosenStaff = $('.combobox').val().match(/\(([^)]+)\)/)[1];
		}
		$.ajax({
			type: "POST",
			url: "staff/add",
			data: {
				'staff': chosenStaff,
				'start': $('#timepicker5').val(),
				'end': $('#timepicker6').val(),
				'eventid': Spec.lastClickedEvent['_id'],
				'eventStart': Spec.lastClickedEvent.start,
				'eventEnd': Spec.lastClickedEvent.end,
			}
		}).done(function(res) {
			console.log('staff added to event ID ' + Spec.lastClickedEvent['_id'] + ': ' + res.id);
			var each_staff_view2 = new Spec.View.EachStaff({ //Backbone new note view used
				'item': {
					'id': res.id,
					'start': res.start,
					'end': res.end,
					'staff': chosenStaff,
					'staffname': $('.combobox').val().substring(0, $('.combobox').val().indexOf('(')-1),
				}
			});
			$('.combobox').val('');
		}); //done function
	}); 	//click event
}


$(document).ready(function() {
	var date = new Date();
	var d = date.getDate();
	var m = date.getMonth();
	var y = date.getFullYear();
	$('#popup').modalPopover({
		target: '#eventButton',
		placement: 'bottom',
		backdrop: false
	});

	$('#calendar').fullCalendar({
		header: {
			left: 'prevYear,prev,next,nextYear today',
			center: 'title',
			right: 'month,agendaWeek,agendaDay'
		},
		//defaultView: 'agendaWeek',
		editable: false,
		allDaySlot: false,
		allDayDefault: false,
		firstDay: date.getDay(),
		eventBorderColor: 'black',
		windowResize: function(view) {
			Spec.resizeMap();
		},
		eventClick: function(calEvent, jsEvent, view) {
			//This function should contain specific stuff like opening the event-based selection/description box etc
			$('#popup').modalPopover('hide');
			//front-end eye-candy stuff
			symbol = '';
			if (calEvent.video == true) {
				symbol += '<i class="icon-facetime-video"></i> ';
			}
			
			$('#eventButton').removeClass('disabled');
			Spec.changePopupColor(calEvent);

			//Popover update with event information (can be hidden in a Backbone view)
			$('#popupTitle').html(symbol + calEvent.title);
			$('#popupStaffInfo').html(calEvent.staffAdded + '/' + calEvent.staffNeeded);
			$('#popupContentInside').html(calEvent.desc);
			$('#popupContentHeader').html('<b>' + defaults.dayNames[calEvent.start.getDay()] + ' | ' + calEvent.loc + '</b>');
			
			//Inventory update
			var inventoryOptions = {
				values_url: 'inventory/existing/' + calEvent['_id'],
			};
			$.extend(inventoryOptions,Spec._inventoryProto);
			$('#inventory').html('');
			$('#inventory').tags(inventoryOptions);

			//Notes update
			$.ajax({
				type: "GET",
				url: "notes/existing/" + calEvent['_id'],
			}).done(function(notes) {
				$('#popup').modalPopover('show');
				var note_view = new Spec.View.Notes({'notes':notes });
			});
			Spec.lastClickedEvent = calEvent;
		},
		eventRightClick: function(calEvent, jsEvent, view) {
			jsEvent.preventDefault(); //Right click event only prevents default because context menu is binded in eventRender
			Spec.lastClickedEvent = calEvent;
		},
		eventRender: function(event, element) {
			//Adding all events to an array for event filtering with Backbone.js router
			symbol = '';
			if (event.video == true) {
				symbol += '<i class="icon-facetime-video icon-white"></i> ';
			}
			element.find('.fc-event-title').html(symbol + event.title);
			element.contextmenu({
				'target': '#context-menu'
			});

		},
		viewRender: function(view, element) {
			//console.log(view.name);
			try {
				Spec.setTimeline();
			} catch (err) {}
		},
		newEventsComplete: function() { //after each ajax request to the server, new events also filtered by this way
			var currentUrl = Backbone.history.fragment;
			if (currentUrl != '') {
				Spec.app.navigate('', {
					trigger: true
				});
				Spec.app.navigate(currentUrl, {
					trigger: true
				});
			}
		},
		eventSources: [{
			url: 'events/', // Shows all events BUT need it to show only events to certain location
			ignoreTimezone: false
		}],
	});

	//Important: especially not using defaultView option of FullCalendar, for efficient use of lazyFetching.
	$('#calendar').fullCalendar('changeView', 'agendaWeek');
	//Loads the whole month events, and shows them from memory, instead of a new request for each prev/next click.
	Spec.resizeMap();
	$('#leftGroup').prependTo('.fc-header-left');
	$('#rightGroup').appendTo('.fc-header-right');

	//storeAllStaff loading...
	$.ajax({
		type: "GET",
		url: "staff/all/",
	}).done(function(staff) {
		Spec.storeAllStaff = staff;
	});

	// JQUERY EVENTS
	$('#eventButton').click(function(e) {
		$('#eventButton').addClass('disabled');
		$('#popup').modalPopover('hide');
	});
	$('#addNote').click(function(e) {
		$('#newNote').modal('show');
		return false;
	});
	$('#newNote textarea').bind('keypress', function(e) {
	  if ((e.keyCode || e.which) == 13) {
	    $( "#noteSubmit" ).trigger("click");
	    return false;
	  }
	});
	$('#noteSubmit').click(function(e) {
		$('#newNote').modal('hide');
		var note = $('#newNote textarea').val();
		if(note === '' ) {return false;}
		$.ajax({
			type: "POST",
			url: "notes/add",
			data: {
				'note': note,
				eventid: Spec.lastClickedEvent['_id']
			}
		}).done(function(res) {
			console.log('note added to event ID ' + Spec.lastClickedEvent['_id'] + ': ' + note);
			//console.log(msg);
			var each_note_view = new Spec.View.EachNote({ //Backbone new note view used
					'id': res.id,
					'text': note,
					'user': res.user,
					'date': new Date()
			});
		});
		$('#newNote textarea').val('');
	});
	$('.modal').on('show', function() {
		$('#popup').css('opacity', 0.7);
	}).on('hide', function() {
		$('#popup').css('opacity', 1);
	});
	$('a[href="#staffEvent"]').click(function(e) {
		//This part should get the event data and update staff adding modal box
		//$('.eventName').html(Spec.lastClickedEvent.title);
		$.ajax({
			type: "GET",
			url: "staff/get/" + Spec.lastClickedEvent['_id'],
		}).done(function(shifts) {
			//staff rendering will happen here
			//foreach new Date(Date.parse(shift.date));
			for(i = 0; i < shifts.length; i++) {
				var staffProfile = Spec.storeAllStaff.filter(function(staff) {
					return staff.username == shifts[i].staff;
				})[0];
				if(staffProfile == undefined) {
					shifts[i].staffname = '';
				} else {
					shifts[i].staffname = staffProfile.name;
				}
			}
			var staff_view = new Spec.View.Staff({'shifts': shifts });
			/*$.each(staff, function(key, value) {
			});*/
		});
	});

	// Solves Bootstrap typeahead dropdown overflow problem
	$('#collapseTwo').on('click shown keydown', function() {
			$(this).css('overflow', 'visible');
		}).on('hide', function() {
			$(this).css('overflow', 'hidden');
		});
});

$(document).ajaxStart(function() {
	$("#eventButton i").removeClass('icon-book');
	$("#eventButton i").addClass('icon-refresh');
});

$(document).ajaxStop(function() {
	$("#eventButton i").removeClass('icon-refresh');
	$("#eventButton i").addClass('icon-book');
});