Place your MindAR image target files here.

This project uses a single combined target file:

  target.mind

It must contain TWO compiled image targets, in this order:

  index 0 -> sail image
  index 1 -> payung-sekaki image

Generate it with the official MindAR image target compiler:
https://hiukim.github.io/mind-ar-js-doc/tools/compile/

Compile both images together into one .mind file, then save it as:

  public/targets/target.mind

This file is served at /targets/target.mind and is REQUIRED for the AR experience.
