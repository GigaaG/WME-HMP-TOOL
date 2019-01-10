// ==UserScript==
// @name         WME Import
// @icon         https://cdn1.iconfinder.com/data/icons/Momentum_MatteEntireSet/32/list-edit.png
// @namespace    WMEI
// @version      1.1.0
// @description  Import place points into the Waze Map
// @author       Sjors 'GigaaG' Luyckx
// @copyright    2019, Sjors 'GigaaG' Luyckx
// @include      https://www.waze.com/editor*
// @include      https://www.waze.com/*/editor*
// @include      https://beta.waze.com/editor*
// @include      https://beta.waze.com/*/editor*
// @exclude      https://www.waze.com/user/*
// @exclude      https://www.waze.com/*/user/*
// @require      https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js?version=622377
// @grant        GM_xmlhttpRequest
// @connect      https://hmps.sjorsluyckx.nl/

// ==/UserScript==
(function() {
    'use strict';

    function bootstrap(tries = 1) {
        if (W && W.map &&
            W.model && W.loginManager.user &&
            $ ) {
            init();
        } else if (tries < 1000)
            setTimeout(function () {bootstrap(tries++);}, 200);
    }

    // Set variables
    var hmpdata;
    var count;
    var h = 0;
    var username;
    var imported = [];

    function init(){
        username = W.loginManager.user.userName;

        var $section = $("<div>");
        $section.html([
            '<div>',
            '<h2>WME Import</h2>',
            '<b>Hoi ' + username + '! </b>',
            '<p>Selecteer uit onderstaand dropdown menu de weg waarvan je de hectometerpaaltjes wilt gaan importeren.</p>',
            '<span><select style="width:25%;align:center" id="WMEIRoadSelect"><option value=""></option></select><button id="WMEIdownloadButton"><center>Klik om te downloaden</center></button><span>',
            '<p id="savedMessage"></p>',
            '</div>'
        ].join(' '));

        new WazeWrap.Interface.Tab('WME Import', $section.html(), initializeSettings);
        document.getElementById('WMEIdownloadButton').style.visibility = "hidden";
        document.getElementById('WMEIRoadSelect').addEventListener("change", downloadButton);
        document.getElementById('WMEIdownloadButton').addEventListener("click", downloadHMPS);
        document.getElementsByClassName('toolbar-button waze-icon-save')[0].addEventListener("click", saveImported);
        requestAssignedRoads();
    }

    function initializeSettings(){
    }

    function saveImported(){
        if (imported.length > 0){
        var jsonString = JSON.stringify(imported);
        console.log(jsonString);
        $.ajax({
            url: 'https://hmps.sjorsluyckx.nl/save.php',
            type: "GET",
            headers: {
              "accept": "application/json",
              "Access-Control-Allow-Origin":"*"
            },
            data: {"ID":jsonString},
            dataType: 'json',
            crossDomain: true,
            success: function(response){
                console.log(response);
                var countSaved = imported.length;
                document.getElementById('savedMessage').innerHTML = countSaved + " hmp's zijn geimporteerd en opgeslagen in de database.";
                imported = [];
            },
            error: function(response){
                console.log('Error:' + JSON.stringify(response));
            }
        })
        }
    }

    function downloadHMPS(){
        getHMPS();
        var WMEButton = document.getElementById('WMEImportButton');
        console.log(WMEButton);
        if (WMEButton == null){
            var editbuttons = document.getElementById('edit-buttons');
            var button = document.createElement('button');
            button.innerText = 'Loading...';
            button.classList.add("btn", "btn-default");
            button.setAttribute("id", "WMEImportButton");
            button.style.marginTop = "7px";
            button.style.marginLeft = "1px";
            button.onclick = buttonClick;
            editbuttons.appendChild(button);
        } else {
            console.log('Button already exists');
            WMEButton.innerText = 'Loading...';
            document.getElementById('savedMessage').innerHTML = ""
        }
    }

    function downloadButton(selectedRoad){
        var value = document.getElementById('WMEIRoadSelect').value
        var button = document.getElementById('WMEIdownloadButton')
        if (value != ""){
            button.style.visibility = "visible";
        } else {
            button.style.visibility = "hidden";
        }
    }

    function getHMPS(){
        var weg = document.getElementById('WMEIRoadSelect').value
        $.ajax({
            url: 'https://hmps.sjorsluyckx.nl/hmp.php',
            type: "GET",
            headers: {
              "accept": "application/json",
              "Access-Control-Allow-Origin":"*"
            },
            data: {"weg":weg},
            dataType: 'json',
            crossDomain: true,
            success: function(response){
                console.log(response);
                hmpdata = response;
                count = response.length
                document.getElementById('WMEImportButton').innerText = "Volgende (" + count + ")";
            },
            error: function(response){
                console.log('Error:' + JSON.stringify(response));
            }
        })
    }

    function requestAssignedRoads(){
        $.ajax({
            url: 'https://hmps.sjorsluyckx.nl/roads.php',
            type: "GET",
            headers: {
              "accept": "application/json",
              "Access-Control-Allow-Origin":"*"
            },
            data: {'editor':username},
            dataType: 'json',
            crossDomain: true,
            success: function(response){
                var selectRoad = document.getElementById('WMEIRoadSelect');
                var i;
                for(i=0 ; i < response.length ; i++){
                    var opt = document.createElement('option');
                    opt.value = response[i];
                    opt.innerHTML = response[i];
                    selectRoad.appendChild(opt);
                }
            },
            error: function(response){
                console.log('Error:' + JSON.stringify(response));
            }
        })
    }

    function buttonClick(){
        // Getting the data for the place point.
        var pointdata = hmpdata[h];
        var id = pointdata.id;
        var x = pointdata.X;
        var y = pointdata.Y;
        var hmp = (pointdata.hmp);
        var hmpl = pointdata.letter;
        var hmpz = pointdata.zijde;
        var weg = pointdata.weg;

        // Building the correct title
        if (hmpl != ""){
            hmp += " " + hmpl;
        }
        if (hmpz != ""){
            hmp = hmpz + " " + hmp;
        }
        var pointtitle = weg + " " + hmp;
        pointtitle = pointtitle.replace(".", ",");

        // Adjust the i variable and add ID to array
        imported.push(id);
        console.log(imported);
        h = h + 1;
        document.getElementById('WMEImportButton').innerText = "Next import (" + (count - h) + ")";

        // Create point
        createPlace(x,y,pointtitle);
    }

    function createPlace(x, y, title){
        // Set screen to point place
        W.map.setCenter([x , y], 6);

        var PlaceObject = require("Waze/Feature/Vector/Landmark");
        var AddPlace = require("Waze/Action/AddLandmark");
        var NewPlace = new PlaceObject();

        // Creating NewPlace with place details
        NewPlace.geometry = new OL.Geometry.Point(x, y);
        NewPlace.attributes.categories.push("TRANSPORTATION");
        NewPlace.attributes.categories.push("JUNCTION_INTERCHANGE");
        NewPlace.attributes.name = title;
        NewPlace.attributes.description = "Ten behoeve van de hulpdiensten. \nBron: Rijkswaterstaat";
        NewPlace.attributes.lockRank = 2; // <- insert lock level -1

        // Adding the NewPlace to the map
        W.model.actionManager.add(new AddPlace(NewPlace));
        W.selectionManager.setSelectedModels([NewPlace]);

        // Select the added place. 1 out 2 fails, so try again when fails.
        try {
            W.selectionManager.setSelectedModels([NewPlace]);
        } catch (error) {
            console.log(error);
            W.selectionManager.setSelectedModels([NewPlace]);
        }
    }

    bootstrap();
})();