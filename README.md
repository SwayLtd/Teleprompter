# R's prompter
 R's prompter app synchronized over local network

## Roadmap
### TO DO
* [X] Rename all "reading speed" to "velocity"
* [X] Block the manual scroll when the text is playing
* [X] Is the text color picker still needed? > Keep the code in comment for now.
* [X] Rename the update_text and text_updated events to something more global like "properties"
* [ ] Merge the local velocity and font sizes changes with the server changes function
* [ ] Merge all the socket.emit() calls into one function
* [ ] Merge saveState and socket.emit() calls into one function
* [ ] Check if I can delete the isPlaying variable in the socket.emit() calls where it's not needed
* [ ] Delete font size, velocity changes where not needed
* [ ] Change the functions order to match the controls order
* [ ] Refactor the code

### Planned Features
* [ ] Portrait mobile view need to only shows the controls and not the text

### Implemented Features
* [X] Named room system
* [X] Two way synchronization (text, text formatting, velocity, font size, scroll position, play/pause state)
* [X] Automatic text scrolling
* [X] Local settings (text alignment, text reverses, text width, text color, background color, reset button)
* [X] Text formatting (bold, italic, underline, text color, etc.)
> Need to add other already implemented features

### Known Issues
* [X] Fix the "undefined" bug when a state is changed an the other state remains the same
* [X] Fix the velocity shortcut that have a value of "30.000000000000004%" instead of "30%"
* [X] Fix the font size shortcuts that only up or down the font size by 1px
* [X] Fix the play/pause button and shortcut state issue
* [X] Fix the text color picker in the text editor that only work if we press Enter or click on the same text again