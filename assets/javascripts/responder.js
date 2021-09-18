/**
 * Simple Kanban Board
 * 
 * Author: Neil Brittliff based on Scrumblr
 * Date: 1/5/2018
 */


var cards = new Array();
var totalcolumns = 0;
var columns = new Array();
var currentTheme = "smallcards";
var boardInitialized = false;
var keyTrap = null;
var board = {};

var baseurl = location.pathname.substring(0, location.pathname.lastIndexOf('/'));

function unblockUI() {
    $.fn.unblockUI = ({ fadeOut: 50 });
}

function blockUI(message) {
    message = message || 'Waiting...';

    $.fn.blockUI = ({
        message: message,

        css: {
            border: 'none',
            padding: '15px',
            backgroundColor: '#000',
            '-webkit-border-radius': '10px',
            '-moz-border-radius': '10px',
            opacity: 0.5,
            color: '#fff',
            fontSize: '20px'
        },

        fadeOut: 0,
        fadeIn: 10

    });
}

/**
 * Keyup event
 * 
 */
$(document).bind('keyup', (event) => {
    keyTrap = event.which;
});

/**
 * Save the Board
 * 
 */
$('#save').on('click', (e) => {
    var data = {
        columns: columns,
        cards: cards,
        board: board
    };

    var fileutil = new FileUtil(document);

    fileutil.saveAs(data, "kanban.json");

    return false;

});

/**
 * Open the Board
 * 
 */
$('#open').on('click', (e) => {
    var fileutil = new FileUtil(document);

    fileutil.load((files) => {
        Array.prototype.slice.call(files).forEach((file) => {

            $('.card').remove();
            $('.col').remove();

            cards = new Array();
            columns = new Array();

            totalcolumns = 0;
            var fileURL = URL.createObjectURL(file);

            $.get(fileURL, (data) => {
                var kanban = JSON.parse(data);

                resizeBoard(kanban.board.size);
                initColumns(kanban.columns);
                initCards(kanban.cards);

            }, 'text');


        });

    });

    return false;

});

/**
 * Clear the Board
 * 
 */
$('#erase-board').on('click', (event) => {

    $('.card').remove();
    $('.col').remove();

    cards = new Array();
    columns = new Array();

    totalcolumns = 0;

});

/**
 * Draw a Code
 * 
 * @param {*} id the Card Indentifier
 * @param {*} text the Text on the Card
 * @param {*} x the 'x' coordinate
 * @param {*} y the 'y' coordinate
 * @param {*} rot the roation
 * @param {*} colour the card 
 * @param {*} stickers the on the card
 * @param {*} animationspeed the animation speed
 */
function drawNewCard(id, text, x, y, rot, colour, stickers, animationspeed) {
    var html = '<div id="' + id + '" class="card ' + colour +
        ' draggable" style="-webkit-transform:rotate(' + rot +
        'deg);\
	">\
	<img src="assets/images/icons/delete-button.svg" class="card-icon delete-card-icon" />\
	<img class="card-image" src="assets/images/' +
        colour + '-card.png">\
	<div id="content:' + id +
        '" class="content stickertarget droppable">' +
        text + '</div><span class="filler"></span>\
	</div>';

    var card = $(html);

    card.appendTo('#board');

    card.draggable({
        snap: false,
        snapTolerance: 5,
        containment: [0, 0, 2000, 2000],
        stack: ".card",
        start: function(event, ui) {
            keyTrap = null;
        },
        drag: function(event, ui) {
            if (keyTrap == 27) {
                ui.helper.css(ui.originalPosition);
                return false;
            }
        },
        handle: "div.content"
    });

    card.bind("dragstop", function(event, ui) {
        if (keyTrap == 27) {
            keyTrap = null;
            return;
        }

        var data = {
            id: this.id,
            position: ui.position,
            oldposition: ui.originalPosition,
        };

        onChangeCardPosition(data);

    });

    card.children(".droppable").droppable({
        accept: '.sticker',
        drop: function(event, ui) {
            var stickerId = ui.draggable.attr("id");
            var cardId = $(this).parent().attr('id');

            addSticker(cardId, stickerId);
            onAddSticker(cardId, stickerId);

            $('.card-hover-draggable').removeClass('card-hover-draggable');

        },

        hoverClass: 'card-hover-draggable'

    });

    card.on('click', function() {
        var zIndex = parseInt(card.css('zIndex'), 10) + 1;
        card.css('zIndex', zIndex);
    });

    var speed = Math.floor(Math.random() * 1000);
    if (typeof(animationspeed) != 'undefined') speed = animationspeed;

    var startPosition = $("#create-card").position();

    card.css('top', startPosition.top - card.height() * 0.5);
    card.css('left', startPosition.left - card.width() * 0.5);

    card.animate({
        left: x + "px",
        top: y + "px"
    }, speed);

    card.hover(
        function() {
            $(this).addClass('hover');
            $(this).children('.card-icon').fadeIn(10);
        },
        function() {
            $(this).removeClass('hover');
            $(this).children('.card-icon').fadeOut(150);
        }
    );

    card.children('.card-icon').hover(
        function() {
            $(this).addClass('card-icon-hover');
        },
        function() {
            $(this).removeClass('card-icon-hover');
        }
    );

    card.children('.delete-card-icon').click(
        function() {

            $("#" + id).remove();

            var cloneCards = new Array();

            Array.prototype.slice.call(cards).forEach(function(card) {

                if (card.id != id) {

                    cloneCards.push(card);

                }

            });

            cards = cloneCards;

        }

    );

    card.children('.content').editable(function(value, settings) {
        onCardChange(id, value);
        return (value);
    }, {
        type: 'textarea',
        style: 'inherit',
        cssclass: 'card-edit-form',
        onblur: 'submit'
    });

    if (stickers !== null) {
        Array.prototype.slice.call(stickers).forEach(function(sticker) {
            addSticker(id, sticker);
        });
    }

}

/**
 * Animate the Card
 * @param {*} card the Card Identifier
 * @param {*} position the New Position
 */
function moveCard(card, position) {

    card.animate({
        left: position.left + "px",
        top: position.top + "px"
    }, 500);

}

/**
 * Add a Sticker
 * 
 * @param {*} cardId 
 * @param {*} stickerId 
 */
function addSticker(cardId, stickerId) {

    stickerContainer = $('#' + cardId + ' .filler');

    if (stickerId === "nosticker") {
        stickerContainer.html("");
        return;
    }

    if (stickerContainer.html().indexOf(stickerId) < 0) {
        stickerContainer.prepend('<img src="assets/images/stickers/' + stickerId +
            '.png">');
    }

}

/**
 * Create a Card
 * 
 * @param {*} id the 'id' pf the card
 * @param {*} text the cards text
 * @param {*} x the card 'x' location
 * @param {*} y the card 'y' location
 * @param {*} rot the rotation
 * @param {*} colour the card colour
 */
function createCard(id, text, x, y, rot, colour) {

    try {
        drawNewCard(id, text, x, y, rot, colour, null);

        var card = {
            id: id,
            text: text,
            x: x,
            y: y,
            rot: rot,
            stickers: new Array(),
            colour: colour
        };

        cards.push(card);
    } catch (e) {
        alert(e);
    }
}

/**
 * Pick a random colour
 * 
 */
function randomCardColour() {
    var colours = ['yellow', 'green', 'blue', 'white'];

    return colours[Math.floor(Math.random() * colours.length)];
}

/**
 * Initialise the cards into an array
 * 
 * @param {Initialise the Cards} cardArray 
 */
function initCards(cardArray) {
    $('.card').remove();

    cards = cardArray;

    Array.prototype.slice.call(cards).forEach(function(card) {
        drawNewCard(
            card.id,
            card.text,
            card.x,
            card.y,
            card.rot,
            card.colour,
            card.stickers,
            0
        );

    });

    boardInitialized = true;
    unblockUI();

}

/**
 * Add a column name
 * 
 * @param {*} columnName 
 */
function drawNewColumn(columnName) {
    var cls = "col";
    if (totalcolumns === 0) {
        cls = "col first";
    }

    $('#icon-col').before('<td class="' + cls +
        '" width="10%" style="display:none"><h2 id="col-' + (totalcolumns + 1) +
        '" class="editable">' + columnName + '</h2></td>');

    $('.editable').editable(function(value, settings) {
        onColumnChange(this.id, value);
        return (value);
    }, {
        style: 'inherit',
        cssclass: 'card-edit-form',
        type: 'textarea',
        placeholder: 'New',
        onblur: 'submit',
        xindicator: '<img src="assets/images/ajax-loader.gif">'
    });

    $('.col:last').fadeIn(1500);

    totalcolumns++;

}

/**
 * On Column Change
 * 
 * @param {*} id the Card IDentifier
 * @param {*} text 
 */
function onColumnChange(id, text) {
    var names = Array();

    $('.col').each(function() {
        var thisID = $(this).children("h2").attr('id');

        if (id == thisID) {
            names.push(text);
        } else {
            names.push($(this).text());
        }

    });

    updateColumns(names);

}

/**
 * Change the Card
 * 
 * @param {*} id the card identifier
 * @param {*} value the new card value
 */
function onCardChange(id, value) {

    Array.prototype.slice.call(cards).forEach((card) => {

        if (card.id == id) {
            card.text = value;
        }

    });
}


/**
 * Change the card position
 * 
 * @param {*} data the new card position
 */
function onChangeCardPosition(data) {

    Array.prototype.slice.call(cards).forEach((card) => {

        if (card.id == data.id) {
            card.x = data.position.left;
            card.y = data.position.top;
        }

    });

}

/**
 * Responder to add a Sticker request
 * 
 * @param {*} cardId 
 * @param {*} stickerId 
 */
function onAddSticker(cardId, stickerId) {

    Array.prototype.slice.call(cards).forEach((card) => {

        if (card.id == cardId) {

            if (stickerId === "nosticker") {
                card.stickers = new Array();
            } else {
                card.stickers.push(stickerId);
            }

        }

    });

}

/**
 * Remove the Column
 * 
 */
function displayRemoveColumn() {

    if (totalcolumns <= 0) return false;

    $('.col:last').fadeOut(150,
        function() {
            $(this).remove();
        }
    );

    totalcolumns--;

}

/**
 * Create a Column
 * 
 * @param {*} name the Name of the Column 
 */
function createColumn(name) {

    if (totalcolumns >= 8) return false;

    drawNewColumn(name);

    columns.push(name);

}

/**
 * Delete the Column
 * 
 */
function deleteColumn() {

    if (totalcolumns <= 0) return false;

    displayRemoveColumn();

    columns.pop();

}

/**
 * Update the columns
 * 
 * @param {*} columns
 */
function updateColumns(newColumns) {

    columns = newColumns;

}

/**
 * Delete the Column
 * 
 * @param {*} next the column to 'fade out'
 */
function deleteColumns(next) {

    $('.col').fadeOut('slow', next());

}

/**
 * Initialise the Columns
 * 
 * @param {*} columnArray 
 */
function initColumns(columnArray) {
    totalcolumns = 0;
    columns = columnArray;

    $('.col').remove();

    Array.prototype.slice.call(columns).forEach((column) => {

        drawNewColumn(column);

    });

}

/**
 * Change the Theme
 * 
 * @param {*} theme the Theme to change
 */
function changeThemeTo(theme) {

    currentTheme = theme;

    $("link[title=cardsize]").attr("href", "assets/css/" + theme + ".css");

}

/**
 * Resize the Board
 * 
 * @param {*} event the Resize Event 
 * @param {*} ui the UI
 */
function boardResizeHappened(event, ui) {

    board.size = ui.size;

}

/**
 * Resize the Board
 * 
 * @param {*} size the new size
 */
function resizeBoard(size) {

    $(".board-outline").animate({
        height: size.height,
        width: size.width
    });

    board.size = size;

}

/**
 * Calculate the Card Offset
 * 
 */
function calcCardOffset() {
    var offsets = {};
    $(".card").each(function() {
        var card = $(this);

        $(".col").each(function(iCol) {
            var col = $(this);
            if (col.offset().left + col.outerWidth() > card.offset().left +
                card.outerWidth() || iCol === $(".col").length - 1) {
                offsets[card.attr('id')] = {
                    col: col,
                    x: ((card.offset().left - col.offset().left) / col.outerWidth())
                };

                return false;

            }
        });
    });

    return offsets;

}

/**
 * Adjust the Card
 * 
 * @param {*} offsets the new card offsets
 * @param {*} doSync synchtonize all other cards
 */
function adjustCard(offsets, doSync) {
    $(".card").each(function() {
        var card = $(this);
        var offset = offsets[this.id];
        if (offset) {
            var data = {
                id: this.id,
                position: {
                    left: offset.col.position().left + (offset.x * offset.col
                        .outerWidth()),
                    top: parseInt(card.css('top').slice(0, -2))
                },
                oldposition: {
                    left: parseInt(card.css('left').slice(0, -2)),
                    top: parseInt(card.css('top').slice(0, -2))
                }
            };

            if (!doSync) {
                card.css('left', data.position.left);
                card.css('top', data.position.top);
            } else {
                moveCard(card, data.position);
            }

        }
    });
}

$(() => {

    document.addEventListener('dragover', event => event.preventDefault());
    document.addEventListener('drop', event => event.preventDefault());

    board.size = {};
    board.size.width = $("#board").width();
    board.size.height = $("#board").height();

    if (boardInitialized === false) {
        blockUI('<img src="assets/images/ajax-loader.gif" width=43 height=11/>');
    }

    $("#create-card")
        .click(function() {
            var rotation = Math.random() * 10 - 5;
            uniqueID = Math.round(Math.random() * 99999999);
            createCard(
                'card' + uniqueID,
                '',
                58, $('div.board-outline').height(),
                rotation,
                randomCardColour());
        });

    $("#smallify").click(function() {

        if (currentTheme == "bigcards") {
            changeThemeTo('smallcards');
        } else if (currentTheme == "smallcards") {
            changeThemeTo('bigcards');
        }

        return false;

    });

    $('#icon-col').hover(
        function() {
            $('.col-icon').fadeIn(10);
        },
        function() {
            $('.col-icon').fadeOut(150);
        }
    );

    $('#add-col').click(
        function() {
            createColumn('New');
            return false;
        }
    );

    $('#delete-col').click(
        function() {
            deleteColumn();
            return false;
        }
    );

    $(".sticker").draggable({
        revert: true,
        zIndex: 1000
    });

    $(".board-outline").resizable({
        ghost: false,
        minWidth: 700,
        minHeight: 400,
        maxWidth: 3200,
        maxHeight: 1800,
    });

    (function() {
        var offsets;

        $(".board-outline").bind("resizestart", function() {
            offsets = calcCardOffset();
        });

        $(".board-outline").bind("resize", function(event, ui) {
            adjustCard(offsets, false);
        });

        $(".board-outline").bind("resizestop", function(event, ui) {
            boardResizeHappened(event, ui);
            adjustCard(offsets, true);
        });

    })();

    $('#marker').draggable({
        axis: 'x',
        containment: 'parent'
    });

    $('#eraser').draggable({
        axis: 'x',
        containment: 'parent'
    });

});