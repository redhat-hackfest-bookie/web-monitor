var sportListLocation = "/res/sports.json";
var bookieServiceEndpoint = "http://hackfest-alexa-bookie-alexa.apps.mw.consulting-rh-br.com/api/v1/bookie/";
var statsServiceEndpoint = "http://spring-data-jpa-quickstart-alexa.apps.mw.consulting-rh-br.com/";

var bookieContentJS = document.getElementById("bookieContent");
var sportSelect = $('#sportSelect');
var homeTeamSelect = $('#homeTeamSelect');
var awayTeamSelect = $('#awayTeamSelect');

var getPredictionButton = $('#getPredictionButton');

var predictionContainer = $('#predictionContainer');
var predictionText = $('#predictionText');

var lastStatRefreshSpan = $('#lastStatRefreshSpan');
var totalRequestsSpan = $('#totalRequestsSpan');
var requestsPerSportPercentageDiv = $('#requestsPerSportPercentageDiv');
var requestsPerSportTableBody = $('#requestsPerSportTableBody');

var lastReloadFinished = true;

var spinnerOpts = {
  lines: 13, // The number of lines to draw
  length: 38, // The length of each line
  width: 17, // The line thickness
  radius: 45, // The radius of the inner circle
  scale: 1, // Scales overall size of the spinner
  corners: 1, // Corner roundness (0..1)
  color: '#000000', // CSS color or array of colors
  fadeColor: 'transparent', // CSS color or array of colors
  speed: 1, // Rounds per second
  rotate: 0, // The rotation offset
  animation: 'spinner-line-fade-quick', // The CSS animation name for the lines
  direction: 1, // 1: clockwise, -1: counterclockwise
  zIndex: 2e9, // The z-index (defaults to 2000000000)
  className: 'spinner', // The CSS class to assign to the spinner
  top: '50%', // Top position relative to parent
  left: '50%', // Left position relative to parent
  shadow: '0 0 1px transparent', // Box-shadow for the lines
  position: 'absolute' // Element positioning
};

var spinner = new Spinner(spinnerOpts);

console.log("Page loaded!");

$(document).ready(function() {

	//read in sport list
	jQuery.get(sportListLocation, function(data) {
		startSpinner();
		console.log("Read in sports data: " + data);

		var sportsList = data.sports;
		console.log("Got list of sports: " + sportsList);

		sportsList.forEach(function(sport, index) {
			console.log("adding sport: " + sport);

			sportSelect.append($('<option/>', {
        		value: sport,
        		text : sport
    		}));
		});
		stopSpinner();
	});

	sportSelect.change(function() {
		startSpinner();
		populateTeamSelects();
	});

	getPredictionButton.click(function() {
		startSpinner();
		getBookiePrediction();
	});

	$(function () {
    	setInterval(reloadStatistics, 5000);
    });
    reloadStatistics();

    console.log("ready!");
});

function stopSpinner(){
	spinner.stop();
}
function startSpinner(){
	spinner.spin(bookieContentJS);
}


function resetTeams(){
	console.log("Resetting team selects.");
	homeTeamSelect.empty().append('<option selected="selected"></option>');
	awayTeamSelect.empty().append('<option selected="selected"></option>');

}

function populateTeamSelects(){
	console.log("Populating team selects from sport.");
	resetTeams();
	resetPrediction();
	var selectedSport = sportSelect.find(":selected").text();//or val()?

	if(selectedSport == ""){
		console.log("No sport selected.");

		stopSpinner();
		return;
	}

	console.log("Sport selected: \"" + selectedSport + "\"");

	makeCallToBookieService(selectedSport, function(data, status){
		console.log("Got team data from service: " + data);

		data.forEach(function(team, index) {
			var teamName = team.name;
			console.log("adding team: " + teamName);

    		homeTeamSelect.append($('<option/>', {
        		value: teamName,
        		text : teamName
    		}));
    		awayTeamSelect.append($('<option/>', {
        		value: teamName,
        		text : teamName
    		}));
		});
		stopSpinner();
	});
}

function getBookiePrediction(){
	console.log("Getting the bookie prediction.");
	resetPrediction();

	var selectedSport = sportSelect.find(":selected").text();
	var selectedHome = homeTeamSelect.find(":selected").text();
	var selectedAway = awayTeamSelect.find(":selected").text();

	if(selectedSport == ""){
		console.log("No sport selected.");
		updatePredictionResult("No sport selected.");
		stopSpinner();
		return;
	}
	if(selectedHome == ""){
		console.log("No home team selected.");
		updatePredictionResult("No home team selected.");
		stopSpinner();
		return;
	}
	if(selectedAway == ""){
		console.log("No away team selected.");
		updatePredictionResult("No away team selected.");
		stopSpinner();
		return;
	}
	if(selectedHome == selectedAway){
		console.log("Same team selected for home and away.");
		updatePredictionResult("A team can't play against itself.");
		stopSpinner();
		return;
	}

	var request = selectedSport + "/" + selectedHome + "/" + selectedAway;

	makeCallToBookieService(request, function(response, status){
		console.log("Got game result: " + response);

	    var textOut = "";
	    if(response.home_score == response.away_score){
	        textOut = "The game will tie.";
	    }else{
	        var winningTeam = "";
	        var winningScore = "";
	        var losingTeam = "";
	        var losingScore = "";

	        if(response.home_score > response.away_score){
	            winningTeam = response.home_team;
	            winningScore = response.home_score;
	            losingTeam = response.away_team;
	            losingScore = response.away_score;
	        } else {
	            winningTeam = response.away_team;
	            winningScore = response.away_score;
	            losingTeam = response.home_team;
	            losingScore = response.home_score;
	        }

	        textOut = winningTeam + " will win against the " + losingTeam + " " + winningScore + " to " + losingScore + ".";
	    }

	    updatePredictionResult(textOut);
	    stopSpinner();
	});
}

function resetPrediction(){
	predictionContainer.hide();
	predictionText.empty();
}

function updatePredictionResult(resultString){
	predictionContainer.show();
	predictionText.text(resultString);
}

function makeCallToBookieService(request, process){
	var fullEndpoint = encodeURI(bookieServiceEndpoint + request);
	console.log("Hitting bookie endpoint: " + fullEndpoint);

	$.get(fullEndpoint, process);
}

function reloadStatistics(){
	console.log("Reloading stats data.");
	if(!lastReloadFinished){
		console.log("Last reload not completed yet. Skipping reload.");
		return;
	}
	lastReloadFinished = false;

	reloadSportStats();

	lastReloadFinished = true;
}

function updateLastReloadTie(){
	lastStatRefreshSpan.text(new Date().toISOString());
}

function reloadSportStats(){
	makeCallToStatsService("sports", function(sports, status){
		console.log("Got sports stats result: " + sports);

		var total = 0;
		sports.forEach(function(sport, index) {
			total += sport.hitCount;
		});

		totalRequestsSpan.text(total);

		requestsPerSportTableBody.empty();
		requestsPerSportPercentageDiv.empty();
		var lastColor = cycleColor("");
		sports.forEach(function(sport, index) {
			var percentage = (((sport.hitCount/total) * 100).toFixed(3));
			requestsPerSportTableBody.append('<tr><td>'+sport.name+'</td><td>'+sport.hitCount+'</td><td>'+percentage+'</td></tr>');

			requestsPerSportPercentageDiv.append('<div class="progress-bar '+lastColor+' requestsPerSportPercentageSegment" role="progressbar" style="width: '+percentage+'%;" aria-valuenow="'+percentage+'" aria-valuemin="0" aria-valuemax="100">'+sport.name+'</div>');

			lastColor = cycleColor(lastColor);
		});

		updateLastReloadTie();
	});
}

function cycleColor(last){
	switch(last){
		case "bg-success":
			return "bg-info";
		case "bg-info":
			return "bg-danger";
		default:
			return "bg-success";
	}
}

function makeCallToStatsService(request, process){
	var fullEndpoint = encodeURI(statsServiceEndpoint + request);
	console.log("Hitting stats endpoint: " + fullEndpoint);

	$.get(fullEndpoint, process);
}
