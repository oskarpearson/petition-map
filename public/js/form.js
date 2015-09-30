var current_petition,
  mp_data,
  ui_hidden = false;

// Options for loading spinner
var opts = {
    lines: 13,
    length: 28,
    width: 14,
    radius: 42,
    scale: 0.5,
    corners: 1,
    color: '#000',
    opacity: 0.25,
    rotate: 0,
    direction: 1,
    speed: 1,
    trail: 60,
    fps: 20,
    zIndex: 2e9,
    className: 'spinner',
    top: '50%',
    left: '50%',
    shadow: false,
    hwaccel: false
}

// Start spinner and attach to target
var target = document.getElementById('spinner_area')
var spinner = new Spinner(opts).spin(target);

// On start load the petition data
$(document).ready(function() {
    $.getJSON("https://petition.parliament.uk/petitions.json?state=open", function (data) {
        var petitions = data.data;
        $.each(petitions, function (index, item) {
            var dropdown_text = item.attributes.action;
            $('#petition_dropdown').append(
                $('<option></option>').val(item.id).html(dropdown_text)
            );
        });

        load_mp_data();

        prepareInitialPetitionAndView();
    });
});

// Setup petition ui and map based on initial url params
function prepareInitialPetitionAndView() {
  var variables = getURLVariables(),
      area,
      petition_id;

  if (variables.petition !== undefined) {
    petition_id = variables.petition;
  } else {
    petition_id = $("#petition_dropdown").val();
  }

  if (variables.area !== undefined) {
    area = variables.area;
  } else {
    area = 'gb';
  }

  $("input[name='area'][value=" + area + "]").prop("checked",true);
  $('#petition_dropdown').val(petition_id);
  load_petition(petition_id, false);
}

// Extracts variables from url
function getURLVariables() {
  var variables = {},
    keyValuePairs = window.location.search.substring(1).split('&');

  if (keyValuePairs == "") return {};
  for (var i = 0; i < keyValuePairs.length; ++i) {
    var keyValuePair = keyValuePairs[i].split('=', 2);
    if (keyValuePair.length == 1)
      variables[keyValuePair[0]] = "";
    else
      variables[keyValuePair[0]] = decodeURIComponent(keyValuePair[1].replace(/\+/g, " "));
  }
  return variables;
};

// Get link for specific petition and area
function get_link() {
    var root_url = window.location.origin;
    var petition = current_petition.data.id;
    var area = $("input[name='area']:checked").val();
    var link = root_url + "/?" + "petition=" + petition + "&area=" + area;
    return link;
}

// Loads MP JSON data and fills constituency dropdown
function load_mp_data() {
    $.getJSON("json/mps/constituency_party_ons.json", function (data) {
        mp_data = data;
        var sorted_mp_data = []
        for (a in data) {
            sorted_mp_data.push({id: a, text: data[a].constituency}) };
        sorted_mp_data.sort(function(a, b) {
            return a.text.localeCompare(b.text);
        }),
        $.each(sorted_mp_data,
            function (_idx, item) {
                $('#constituency').append(
                    $('<option></option>').val(item.id).html(item.text)
                );
            }
        );
    });
}

// Loads petition from UK Government Petition site
function load_petition(petition_id, is_url) {
    var petition;

    // Check if url is supplied, otherwise create url
    if (is_url) {
        petition = petition_id;
    } else {
        petition = "https://petition.parliament.uk/petitions/" + petition_id;
    }

    $.getJSON(petition + ".json", function (data) {
        current_petition = data;
        display_petition_info(petition_id);
        reload_map();
    })
    .fail(function() {
        alert("Petition not found!");
    });
}

// Display petition info in panel
function display_petition_info() {
    $('#petition_info').hide();

    var count = number_with_commas(current_petition.data.attributes.signature_count);

    var sign_link = 'https://petition.parliament.uk/petitions/' + current_petition.data.id + '/signatures/new';
    var count_html = '<p class="signatures_count"><span class="data">' + count + '</span> signatures</p>';
    var sign_html = '<a class="flat_button sign" href="' + sign_link + '"><i class="fa fa-pencil"></i> Sign Petition</a>';

    var petition_details =
      '<div class="petition-details">' +
        '<h2>' + current_petition.data.attributes.action + '</h2>' +
        count_html +
        '<div>' + sign_html +'</div>' +
      '</div>';

    $('#petition_info .petition-details').replaceWith(petition_details);
    $('#petition_info').show();
}

// Reset zoom and reload map with new area
function change_area() {
    spinner.spin(target);
    reset();
    reload_map();
}


// Reload map
function reload_map() {
    var units = "wpc";

    var area = $("input[name='area']:checked").val();

    var f = 'json/uk/' + area + '/topo_' + units + '.json';
    load_data(f, units);
}


////////////////////////////////////////////////////////////////////////////////


// Area selection
$("input[name='area']").on('change', change_area);

// Petition selection
$("#petition_dropdown").on('change', function() {
    spinner.spin(target);

    var petition_id = $("#petition_dropdown").val()

    load_petition(petition_id, false);
});

// Constituency selection
$("#constituency").on('change', function() {
    var ons_code = $("#constituency").val()

    var constituency_data = {
        "id": ons_code
    }

    select(constituency_data);
});

// Create & open sharing modal
$('#share_button').on('click', function() {
    var link = get_link();

    $('#petition_link').val(link);

    // Clone modal
    var modal = $("#modal").clone();

    // Open modal
    vex.dialog.open({
        message: $(modal).show(),
        buttons:
        [$.extend({}, vex.dialog.buttons.NO, { text: 'Close' })],
    });
});

// Button to hide UI
$('#hide_ui').on('click', function() {
    if (ui_hidden) {
        $('#petition_info').fadeIn();
        $('#key').fadeIn();
        $('#hide_ui').html("Hide UI");
        ui_hidden = false;
    } else {
        $('#petition_info').fadeOut();
        $('#key').fadeOut();
        $('#hide_ui').html("Show UI");
        ui_hidden = true;
    }
});

// Button to enter custom petition url
$('#petition_button').on('click', function() {
    petition_url = $('#petition_url').val();

    load_petition(petition_url, true);

    recolour_map();
});


// Lock screen to portrait on mobile
var previousOrientation = window.orientation;
var check_orientation = function(){
    if(window.orientation !== previousOrientation){
        previousOrientation = window.orientation;

        if (window.orientation !== 0) {
            $("#support").fadeIn();
            setTimeout(function () {
                alert("Landscape mode is not supported on mobile devices")
            }, 1000);
        } else {
            $("#support").fadeOut();
        }
    }
};

window.addEventListener("resize", check_orientation, false);
window.addEventListener("orientationchange", check_orientation, false);

