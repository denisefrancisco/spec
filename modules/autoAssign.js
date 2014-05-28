// This module runs regularly to assign staff to unstaffed events
var db             = require('./promised-db.js'),
    fetchCalendars = require('./fetchCalendars.js');

var _      = require('underscore'),
    moment = require('moment-range');

var isValidDate = function(d) {
  return !isNaN(d.getTime());
};

var fetch = function(start, end, user, callback) {
    fetchCalendars({
        start: start,
        end:   end,
        user:  user,
        success: function(items) {
            callback(items);
        },
        error: function(err) {
            callback([]);
        }
    });
};

var isStaffAvailable = function(event, pointStaffObj) {
  //check each event in the events key of the pointStaffObj
  // to determine if the staff has any conflicting thing
  event.range = moment().range(event.start, event.end);

  return pointStaffObj.gEvents.map(function(gEvent) {
    return moment().range(gEvent.start, gEvent.end);
  }).reduceRight(function(prev, current) {
    return prev && (!event.range.overlaps(current));
  }, true);
};

var assignEventStaff = function(event, pointStaffObj) {
  //assigns the staff to the event
  console.log('Assign ' + pointStaffObj.staff.username + ' to ' + event.title);
};

module.exports = function () {
  var threeDaysLater = {
      start: moment().add('d', 3).startOf('day').toDate(),
      end: moment().add('d', 3).endOf('day').toDate()
  };

  var eventsToAssign = [];

  db.events.find({
    start: {
      $gte: threeDaysLater.start,
      $lt: threeDaysLater.end
    }
  }).toArray().then(function (events) {
    eventsToAssign = events;
    return db.staff.find({task: 'events'}).toArray();
  }).then(function (employees) {
     parallel = employees.map(function (employee) {
       return function (cb) {
         db.events.find({
                         start: {
                           $gte: moment().subtract('d', 30).startOf('day').toDate()
                         }, 
                         shifts: {$elemMatch: {staff: employee.username}}
                       }, function (err, events) {
           if(err || !events) {return false;}
           cb(null, {staff: employee, events: events});
         });
       };
     });

     async.parallel(parallel, function (err, eventStaff) {
       var categoryValue = {
         "A" : 1,
         "B" : 1.5,
         "C" : 2
       };

       var pointList = _(eventStaff.map(function (obj) {
         var p = obj.events.reduceRight(function (point, event) {
           return point + categoryValue[event.category];    
         }, 0);

         return {staff: obj.staff, point: p};
       })).sortBy(function (o) {
         return o.point;
       });

       //pointList is a sorted array of objects
       //fields in objects: staff, point
       //array asc sorted by point

       async.map(pointList, 
       function(pointObj, cb) {
         //fetch events for the user and assign them to `events` key.
         fetch(threeDaysLater.start,
               threeDaysLater.end,
               pointObj.staff.username, 
               function(gEvents) {
                 pointObj.gEvents = gEvents.map(function(gEvent) {
                   return {
                     start: new Date(gEvent.start.dateTime),
                     end:   new Date(gEvent.end.dateTime)
                   };
                 }).filter(function(gEvent) {
                   return isValidDate(gEvent.start) && isValidDate(gEvent.end);
                 });

                 cb(null, pointObj);
               });
       },
       function(err, pointListWithEvents) {
       //pointListWithEvents is a sorted array of objects
       //fields in objects: staff, point, gEvents
      
        // Starting from the top of the list,
        // 1) check availability for the user for each event
        // 2) assign staff to the first possible event
        // 3) remove the assigned staff from the candidate list
        // 4) Continue looping through the events
         eventsToAssign.forEach(function(event) {
           //using a for loop to be able to break it when a match is found
           for (var i = pointListWithEvents.length - 1; i >= 0; i--) {
             if(isStaffAvailable(event, pointListWithEvents[i])) {
               //staff is available, assign
               assignEventStaff(event, pointListWithEvents[i]);
               //remove the staff from the candidate list for next events
               pointListWithEvents = _.without(pointListWithEvents, pointListWithEvents[i]);
               break;
             }
           }

         });

       });
      //end of async.map
     });
  });
};