(function ($) {
    $.fn.locationradius = function (userSettings) {
        var obj = this, polymaps = org.polymaps, map,
            defaultBingKey = "AlqI7L-vfZLiRTcdvsrbgmpFhjX89uT7wgZzJT7x6U8ZZvi96cdf2mA3jQUFlViC",
            defaultMapType = "Road",
            settings = {
                bingKey:        defaultBingKey,
                mapType:        defaultMapType
            },
            data, resourceSets, resources, resource, i = 0, j = 0,
            mapClick, mapGeoJson, mapPolygon, mapPoint;
        
        //private functions
        function normalizeLatLong(point) {
            if (point.lon < 0) {
                while (Math.abs(point.lon) > 360) { point.lon+=360; }
            } else {
                while (point.lon > 360) { point.lon-=360; }
            }

            if (point.lat < 0) {
                while (Math.abs(point.lat) > 360) { point.lat+=360; }
            } else {
                while (point.lat > 360) { point.lat-=360; }
            }
            return point;
        }
        
        function addDropPoint (a) {
            map.remove(mapGeoJson);
            map.add(mapGeoJson=polymaps.geoJson()
                .features([
                    {
                      "geometry": {
                        "coordinates": [convertPolySet(getPoints(normalizeLatLong(map.pointLocation(map.mouse(a))), 100, 360))],
                        "type": "Polygon"
                      },
                    }
                ]));
        }

        function addDropPointHandler (element) {
            var rVal = null;
            if (element.addEventListener) {   // all browsers except IE before version 9
                rVal = element.addEventListener("click", addDropPoint, false);
            } 
            else {
                if (element.attachEvent) {    // IE before version 9
                    rVal = element.attachEvent('onclick', addDropPoint);
                }
            }
            return rVal;
        }

        function removeDropPointHandler (element) {
            if (element.removeEventListener) {
                element.removeEventListener ("click", addDropPoint, false);
            } else {
                if (element.detachEvent) {
                    element.detachEvent ('onclick', addDropPoint);
                }
            }
            return null;
        }
        
        function jsonpCallback(d,element) {
            var $this = $(element);
            data = (typeof d === "object") ? d : false;
            /* Display each resource as an image layer. */
            resourceSets = data.resourceSets;
            for (i = 0; i < resourceSets.length; i++) {
                resources = data.resourceSets[i].resources;
                for (j = 0; j < resources.length; j++) {
                    resource = resources[j];
                    map.add(polymaps.image()
                        .url(template(resource.imageUrl, resource.imageUrlSubdomains)))
                        .tileSize({x: resource.imageWidth, y: resource.imageHeight});
                }
            }
            
            map.add(polymaps.compass()
                .pan("none"));
            map.add(mapGeoJson = polymaps.geoJson());   
            mapClick = addDropPointHandler(element);    
        }
        
        /** Returns a Bing URL template given a string and a list of subdomains. */
        function template(url, subdomains) {
            var n = subdomains.length,
                salt = ~~(Math.random() * n); // per-session salt
        
            /** Returns the given coordinate formatted as a 'quadkey'. */
            function quad(column, row, zoom) {
                var key = "";
                for (var i = 1; i <= zoom; i++) {
                    key += (((row >> zoom - i) & 1) << 1) | ((column >> zoom - i) & 1);
                }
                return key;
            }
        
            return function(c) {
                var quadKey = quad(c.column, c.row, c.zoom),
                    server = Math.abs(salt + c.column + c.row + c.zoom) % n;
                return url
                    .replace("{quadkey}", quadKey)
                    .replace("{subdomain}", subdomains[server]);
            };
        }
        
        function getPoint(startPoint, bearingDeg, distance) {
            "use strict";
            var radius = 6371, /*Radius of Earth in km*/
                pi = Math.PI, /* Pi */
                d2r = pi / 180, /*Multipy degress value by d2r to convert to radians.*/
                r2d = 180 / pi, /*Multipy radians value by r2d to convert to degrees.*/
                angularDistance,
                bearingRad = !isNaN(bearingDeg) ? Number(bearingDeg) * d2r : 0,
                lat1Deg = !isNaN(startPoint.lat) ? Number(startPoint.lat) : 0,
                lon1Deg = !isNaN(startPoint.lon) ? Number(startPoint.lon) : 0,
                lat1Rad = lat1Deg * d2r,
                lon1Rad = lon1Deg * d2r,
                lat2Rad,
                lon2Rad,
                lat2Deg,
                lon2Deg,
                endPoint = [];
            
            distance = !isNaN(distance) ? Number(distance) : 50;
            angularDistance = distance / radius;
        
            lat2Rad = Math.asin(Math.sin(lat1Rad)
                    * Math.cos(angularDistance)
                    + Math.cos(lat1Rad)
                    * Math.sin(angularDistance)
                    * Math.cos(bearingRad));
            lon2Rad = lon1Rad
                    + Math.atan2(Math.sin(bearingRad)
                    * Math.sin(angularDistance)
                    * Math.cos(lat1Rad),
                    Math.cos(angularDistance)
                    - Math.sin(lat1Rad)
                    * Math.sin(lat2Rad));
        
            lon2Rad = (lon2Rad + 3 * Math.PI) % (2 * Math.PI) - Math.PI; /*normalise to -180..+180 degrees*/
            lon2Deg = lon2Rad * r2d;
            lat2Deg = lat2Rad * r2d;
        
            endPoint =  {lat: lat2Deg, lon: lon2Deg};
        
            return endPoint;
        }
        
        function getPoints(startPoint, distance, numberOfPoints) {
            "use strict";
            var radiusPoints = [],
                radiusDegreeDistance = 1,
                radiusCounter = 0;
        
            startPoint = (typeof startPoint === "object") ? startPoint : {lat: 0, lon: 0};
            distance = !isNaN(distance) ? Number(distance) : 50;
            numberOfPoints = !isNaN(numberOfPoints) ? Number(numberOfPoints) : 360;
            radiusPoints = [];
            radiusDegreeDistance = 360 / numberOfPoints;
        
            for (radiusCounter = 0; radiusCounter < 360; radiusCounter += radiusDegreeDistance) {
                radiusPoints.push(getPoint(startPoint, radiusCounter, distance));
            }
            radiusPoints.push(radiusPoints[0]);
            
            console.log(radiusPoints);
            return radiusPoints;
        }
        
        function convertPolySet(points) {
            "use strict";
            var newPoints = [], x;
        
            for (x in points) {
                newPoints.push([points[x].lon,points[x].lat]);
            }
        
            return newPoints;
        }
         
        //end private functions
        
        $.fn.extend({
            main: function() {
                if(userSettings) { $.extend(settings,userSettings); }
                return this.each(function() {
                    var $this = $(this).empty(), element = this,
                        jsonUrl = "http://dev.virtualearth.net"
                            + "/REST/V1/Imagery/Metadata/" + settings.mapType
                            + "?key=" + settings.bingKey;
                    map = polymaps.map()
                        .container(this.appendChild(polymaps.svg("svg")))
                        .add(polymaps.interact())
                        .add(polymaps.hash())
                        .zoomRange([3,18])
                        .zoom(3),
                    $.ajax({
                        dataType:"jsonp",
                        url: jsonUrl,
                        jsonp:"jsonp",
                        success:function(data){jsonpCallback(data,element);}
                    });
                });                    
            }
        });
        
        
        obj.main();
        
    };
}(jQuery));



function buildPoints(){
    var radius=50;
    var latitude=90;
    var longitude=0;
    var pi = Math.PI;
    var d2r = pi/180;
    var r2d = 180/pi;
    var rEarth = 3693;
    var cLat = (radius / rEarth) * r2d;
    var cLng = cLat / Math.cos(latitude * d2r);
    console.log("cLat",cLat);
    console.log("cLng",cLng);

    var points = [];
    console.log("declaring points array", points);

    for (var i=0; i < 360; i++) {
        var theta = Math.PI * (i/16);
        var point = [
            longitude + (cLng * Math.cos(theta)),
            latitude + (cLat * Math.sin(theta))
            
        ];
        console.log("New Point",point);
        points.push(point);

    }
    console.log("All Points",points);
    points.push(points[0]);

    return points;
}
