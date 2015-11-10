/**
 * @ngdoc controller
 * @name MapController
 */
(function() {
  'use strict';
  var Attr2MapOptions;

  var __MapController = function(
      $scope, $element, $attrs, $parse, _Attr2MapOptions_, NgMap
    ) {
    Attr2MapOptions = _Attr2MapOptions_;
    var vm = this;

    vm.mapOptions; /** @memberof __MapController */
    vm.mapEvents;  /** @memberof __MapController */
    vm.ngMapDiv;   /** @memberof __MapController */

    /**
     * Add an object to the collection of group
     * @memberof __MapController
     * @function addObject
     * @param groupName the name of collection that object belongs to
     * @param obj  an object to add into a collection, i.e. marker, shape
     */
    vm.addObject = function(groupName, obj) {
      /**
       * objects, i.e. markers and shapes, are initialized before
       * map is initialized so, we collect those objects, then,
       * we will add to map when map is initialized
       * However the case as in ng-repeat, we can directly add to map
       */
      if (vm.map) {
        vm.map[groupName] = vm.map[groupName] || {};
        var len = Object.keys(vm.map[groupName]).length;
        vm.map[groupName][obj.id || len] = obj;

        //infoWindow.setMap works like infoWindow.open
        if (groupName != "infoWindows" && obj.setMap) {
          obj.setMap && obj.setMap(vm.map);
        }
        if (obj.centered && obj.position) {
          vm.map.setCenter(obj.position);
        }
        (groupName == 'markers') && vm.objectChanged('markers');
      }
    };

    /**
     * Delete an object from the collection and remove from map
     * @memberof __MapController
     * @function deleteObject
     * @param {Array} objs the collection of objects. i.e., map.markers
     * @param {Object} obj the object to be removed. i.e., marker
     */
    vm.deleteObject = function(groupName, obj) {
      /* delete from group */
      if (obj.map) {
        var objs = obj.map[groupName];
        for (var name in objs) {
          objs[name] === obj && (delete objs[name]);
        }

        /* delete from map */
        obj.map && obj.setMap && obj.setMap(null);

        (groupName == 'markers') && vm.objectChanged('markers');
      }
    };

    /**
     * @memberof __MapController
     * @function observeAttrSetObj
     * @param {Hash} orgAttrs attributes before its initialization
     * @param {Hash} attrs    attributes after its initialization
     * @param {Object} obj    map object that an action is to be done
     * @description watch changes of attribute values and
     * do appropriate action based on attribute name
     */
    vm.observeAttrSetObj = function(orgAttrs, attrs, obj) {
      if (attrs.noWatcher) {
        return false;
      }
      var attrsToObserve = Attr2MapOptions.getAttrsToObserve(orgAttrs);
      for (var i=0; i<attrsToObserve.length; i++) {
        var attrName = attrsToObserve[i];
        attrs.$observe(attrName, NgMap.observeAndSet(attrName, obj));
      }
    };

    /**
     * @memberof __MapController
     * @function zoomToIncludeMarkers
     */
    vm.zoomToIncludeMarkers = function() {
      var bounds = new google.maps.LatLngBounds();
      for (var k1 in vm.map.markers) {
        bounds.extend(vm.map.markers[k1].getPosition());
      }
      for (var k2 in vm.map.customMarkers) {
        bounds.extend(vm.map.customMarkers[k2].getPosition());
      }
      vm.map.fitBounds(bounds);
    };

    /**
     * @memberof __MapController
     * @function objectChanged
     * @param {String} group name of group e.g., markers
     */
    vm.objectChanged = function(group) {
      if (group == 'markers' && vm.map.zoomToIncludeMarkers == 'auto') {
        vm.zoomToIncludeMarkers();
      }
    };

    /**
     * @memberof __MapController
     * @function initializeMap
     * @description
     *  . initialize Google map on <div> tag
     *  . set map options, events, and observers
     *  . reset zoom to include all (custom)markers
     */
    vm.initializeMap = function() {
      var mapOptions = vm.mapOptions,
          mapEvents = vm.mapEvents,
          ngMapDiv = vm.ngMapDiv;

      vm.map = new google.maps.Map(ngMapDiv, {});

      // set options
      mapOptions.zoom = mapOptions.zoom || 15;
      var center = mapOptions.center;
      if (!mapOptions.center) {
        mapOptions.center = new google.maps.LatLng(0, 0);
      } else if (!(center instanceof google.maps.LatLng)) {
        var geoCenter = mapOptions.center;
        delete mapOptions.center;
        NgMap.getGeoLocation(geoCenter, mapOptions.geoLocationOptions).
          then(function (latlng) {
            vm.map.setCenter(latlng);
            var geoCallback = mapOptions.geoCallback;
            geoCallback && $parse(geoCallback)($scope);
          }, function () {
            vm.map.setCenter(mapOptions.geoFallbackCenter);
          });
      }
      vm.map.setOptions(mapOptions);

      // set events
      for (var eventName in mapEvents) {
        google.maps.event.addListener(vm.map, eventName, mapEvents[eventName]);
      }

      // set observers
      vm.observeAttrSetObj(orgAttrs, $attrs, vm.map);
      vm.singleInfoWindow = mapOptions.singleInfoWindow;

      /**
       * set map for scope and controller and broadcast map event
       * however an `mapInitialized` event will be emitted every time.
       */
      google.maps.event.addListenerOnce(vm.map, "idle", function () {
        NgMap.addMap(vm);
        if (mapOptions.zoomToIncludeMarkers) {
          vm.zoomToIncludeMarkers();
        }
        //TODO: it's for backward compatibiliy. will be removed
        $scope.map = vm.map;
        $scope.$emit('mapInitialized', vm.map);
      });
    };

    $scope.google = google; //used by $scope.eval to avoid eval()

    /**
     * get map options and events
     */
    var orgAttrs = Attr2MapOptions.orgAttributes($element);
    var filtered = Attr2MapOptions.filter($attrs);
    var options = Attr2MapOptions.getOptions(filtered);
    var controlOptions = Attr2MapOptions.getControlOptions(filtered);
    var mapOptions = angular.extend(options, controlOptions);
    var mapEvents = Attr2MapOptions.getEvents($scope, filtered);
    console.log("filtered", filtered,
      "mapOptions", mapOptions, 'mapEvents', mapEvents);

    vm.mapOptions = mapOptions;
    vm.mapEvents = mapEvents;

    // create html <div> for map
    vm.ngMapDiv = NgMap.getNgMapDiv($element[0]);
    $element.append(vm.ngMapDiv);

    if (!options.lazyInit) { // allows controlled initialization
      vm.initializeMap();
    }

  }; // __MapController

  __MapController.$inject = [
    '$scope', '$element', '$attrs', '$parse', 'Attr2MapOptions', 'NgMap'
  ];
  angular.module('ngMap').controller('__MapController', __MapController);
})();
