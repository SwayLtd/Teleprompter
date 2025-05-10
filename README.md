# Sway  Prompter

Sway Teleprompter: A collaborative teleprompter tool designed for real-time, multi-device text synchronization. Ideal for teams in broadcast, stage, and studio production.

## Roadmap

### TO DO

* [X] Rename all "reading speed" to "velocity"
* [X] Block the manual scroll when the text is playing
* [X] Is the text color picker still needed? > Keep the code in comment for now.
* [X] Rename the update_text and text_updated events to something more global like "properties"
* [X] Check if I can delete the isPlaying variable in the socket.emit() calls where it's not needed
* [X] Delete font size, velocity changes where not needed
* [X] Merge the local velocity and font sizes changes with the server changes function
* [X] Merge all the socket.emit() calls into one function
* [X] Merge saveState and socket.emit() calls into one function
* [X] Change the functions order to match the controls order (roomID, syncText, roomName, isPlaying, scrollTop, textAlignment, textOrientation, velocity, fontSize, textWidth, textColor, bgColor)
* [X] Check if the e.preventDefault() can be called at the beginning of the function instead of in every if statement
* [X] Refactor the code
* [X] 2 times more velocity steps
* [X] Syncing the text editing scroll position
* [X] Increase font size maximum (new default is 72px)
* [X] Sync text width
* [X] Move the arrows up and down
* [X] Automatically pause the text scrolling when it reach the end of the scroll
* [ ] Remove jQuery to use only vanilla JavaScript
* [ ] Moving all isPlaying changes to toogleAutoScroll()
* [ ] Limit the number of interface of the same room opened at the same time
* [ ] Button to invert the arrow shortcuts and wheel scroll direction

### Planned Features

* [ ] UI v2
* [ ] Scroll pad for mobile
* [ ] Implement Redis to store rate limiting data and for caching to improve performances (don't forget Handle Cache Invalidation)
* [ ] Bluetooth remote implementation
* [ ] Integrated audio recorder (compatible with ASIO driver?)

### Implemented Features

* [X] Named room system
* [X] Two way synchronization (text, text formatting, velocity, font size, scroll position, play/pause state)
* [X] Automatic text scrolling
* [X] Local settings (text alignment, text reverses, text width, text color, background color, reset button)
* [X] Text formatting (bold, italic, underline, strikethrough, text color, etc.)
* [X] Remote in portrait mobile view
* [X] Rate limiting
* [X] Database implementation
* [X] Reading timer

> Need to add other already implemented features

### Known Issues

* [X] Fix the "undefined" bug when a state is changed an the other state remains the same
* [X] Fix the velocity shortcut that have a value of "30.000000000000004%" instead of "30%"
* [X] Fix the font size shortcuts that only up or down the font size by 1px
* [X] Fix the play/pause button and shortcut state issue
* [X] Fix the text color picker in the text editor that only work if we press Enter or click on the same text again
* [X] Fix the wheel event that is working with the manual scroll when the text is playing
* [X] Fix the velocity value issue caused by floating-point arithmetic inaccuracies in JavaScript
* [X] Fix the synchronization  issue when all the information are not stored on the server because only the last one is stored without all properties
* [X] Fix the sync button that doesn't do anything
* [X] Fix the ability to format the room name text
* [X] Fix the scroll position going to the bottom of the text when formatting the text
* [ ] Fix the room name editing that is not working on mobile
