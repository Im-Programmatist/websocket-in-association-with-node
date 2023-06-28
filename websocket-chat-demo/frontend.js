
$(function () {
    "use strict";
    console.log('entered in frontend js file....');
    // for better performance - to avoid searching in DOM
    var content = $('#content');
    var input = $('#input');
    var status = $('#status');
    // my color assigned by the server
    var myColor = false;
    // my name sent to the server
    var myName = false;
    // if user is running mozilla then use it's built-in WebSocket
    window.WebSocket = window.WebSocket || window.MozWebSocket;
    // if browser doesn't support WebSocket, just show
    // some notification and exit
    if (!window.WebSocket) {
      content.html($('<p>',
        { text:'Sorry, but your browser doesn\'t support WebSocket.'}
      ));
      input.hide();
      $('span').hide();
      return;
    }
    // open connection
    var connection = new WebSocket('ws://localhost:1337');
    connection.onopen = function () {
      // first we want users to enter their names
      input.removeAttr('disabled');
      status.text('Choose name:');
    };
    connection.onerror = function (error) {
      // just in there were some problems with connection...
      content.html($('<p>', {
        text: 'Sorry, but there\'s some problem with your '
           + 'connection or the server is down.'
      }));
    };
    // most important part - incoming messages
    connection.onmessage = function (message) {
      // try to parse JSON message. Because we know that the server
      // always returns JSON this should work without any problem but
      // we should make sure that the massage is not chunked or
      // otherwise damaged.
      try {
        var json = JSON.parse(message.data);
      } catch (e) {
        console.log('Invalid JSON: ', message.data);
        return;
      }
      // NOTE: if you're not sure about the JSON structure
      // check the server source code above
      // first response from the server with user's color
      if (json.type === 'color') { 
        myColor = json.data;
        status.text(myName + ': ').css('color', myColor);
        input.removeAttr('disabled').focus();
        // from now user can start sending messages
      } else if (json.type === 'history') { // entire message history
        // insert every single message to the chat window
        for (var i=0; i < json.data.length; i++) {
          if(json.data[i].imgFlag){
            addMessage(json.data[i].author, json.data[i].text,
              json.data[i].color, new Date(json.data[i].time), json.data[i].imgFlag, json.data[i].image);
          }else{
            addMessage(json.data[i].author, json.data[i].text,
              json.data[i].color, new Date(json.data[i].time), json.data[i].imgFlag,0 );
          }
       
        }
      } else if (json.type === 'message') { // it's a single message
        // let the user write another message
        input.removeAttr('disabled'); 
        // addMessage(json.data.author, json.data.text,
        //            json.data.color, new Date(json.data.time));
        if(json.data.imgFlag){
          addMessage(json.data.author, json.data.text,
            json.data.color, new Date(json.data.time), json.data.imgFlag, json.data.image);
        }else{
          addMessage(json.data.author, json.data.text,
            json.data.color, new Date(json.data.time), json.data.imgFlag,0 );
        }
      } else {
        console.log('Hmm..., I\'ve never seen JSON like this:', json);
      }
    };
    /**
     * Send message when user presses Enter key
     */
    input.keydown(function(e) {
      if (e.keyCode === 13) {
        var msg = $(this).val();
        if (!msg) {
          return;
        }
        // send the message as an ordinary text
        connection.send(msg);
        $(this).val('');
        // disable the input field to make the user wait until server
        // sends back response
        input.attr('disabled', 'disabled');
        // we know that the first message sent from a user their name
        if (myName === false) {
          myName = msg;
        }
      }
    });

    $('#imageUpload').bind('change', function(e){
      console.log('Image uploaded...');
      var data = e.originalEvent.target.files[0];
      readThenSendFile(data);      
    });
    
    function readThenSendFile(data){
      console.log('image data -', data);
        var reader = new FileReader();
        reader.onload = function(evt){
            var msg ={};
            msg.username = "chetan";
            msg.file = evt.target.result;
            msg.fileName = data.name;
            msg.type = "image";
            //document.querySelector("#preview").src  = evt.target.result;
            //document.querySelector("#b64text").textContent = evt.target.result;
            connection.send(evt.target.result);
        };
        reader.readAsDataURL(data);
    }
    /**
     * This method is optional. If the server wasn't able to
     * respond to the in 3 seconds then show some error message 
     * to notify the user that something is wrong.
     */
    setInterval(function() {
      if (connection.readyState !== 1) {
        status.text('Error');
        input.attr('disabled', 'disabled').val(
            'Unable to communicate with the WebSocket server.');
      }
    }, 3000);
    /**
     * Add message to the chat window
     */
    function addMessage(author, message, color, dt, imgFlag, image) {
      if(!imgFlag){
        console.log('inside false 1');
        content.prepend('<p><span style="color:' + color + '">'
          + author + '</span> @ ' + (dt.getHours() < 10 ? '0'
          + dt.getHours() : dt.getHours()) + ':'
          + (dt.getMinutes() < 10
            ? '0' + dt.getMinutes() : dt.getMinutes())
          + ': ' + message + '</p>');
      }else{
        console.log('inside false 2');
        content.prepend('<p><span style="color:' + color + '">'
          + author + '</span> @ ' + (dt.getHours() < 10 ? '0'
          + dt.getHours() : dt.getHours()) + ':'
          + (dt.getMinutes() < 10
            ? '0' + dt.getMinutes() : dt.getMinutes())
          + ': ' + message + '</p>'
          + '<img src="'+image+'" alt="test-img" width="20%" height="auto"/>');
      }
      
    }
});