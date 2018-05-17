# Parson's-Puzzles
This is a small Software, written in Javascript (to be served with NodeJS), to 
support teachers, professors as well as their students in the usage of 
so-called "Parson's Puzzles" (see [Dale Parsons et al.](https://www.researchgate.net/publication/262160581_Parson%27s_programming_puzzles_A_fun_and_effective_learning_tool_for_first_programming_courses) )

# Features
* Written in Javascript, both Server-Side and Client-Side.
* Websockets support to collaborate on the same puzzle
* Puzzle creation assistant with LaTeX export
* JavaScript-Interpreter - allows the students to directly run the puzzles in their browser

# Installation/Usage
* Basic install:
    ```
    git clone …
    npm install
    PORT=8080 node index.js
    ```

* Options:
  There exist a few configurable Options, which can be set using Environment variables:
    ```
    PORT=1234
    MASTER_PW=passwort_to_be_used_as_master_pw
    AUTH_ADMIN=_if_set_require_basic_auth_with_user
    AUTH_PASS=_and_password
    ```    

# License
See License.md (GPLv3). If this License presents a challenge for the usage of this software, feel free to contact the original Author!