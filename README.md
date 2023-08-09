# Project Description

The purpose of this project is to create a client in JS, `client.js` which has to able to connect to an XMPP server with the domain *@alumchat.xyz* and server port *5222*. The client has to be able to do multiple functionalities which are the general functionalities a chat applicacion can have. The project also has a `main.js` file, which is the controller of the program, this file is the responsible of making the client work, and it does this by calling the functions and displaying the data in a way that is more organized. 

# Functionalities

The application consists of a series of functionalities, that are all implemented as functions of the client.

The four main general functionalities the application has are the following:
- `register(username, password, email)`:
- `login(username, password)`: 
- `logout()`:
- `deleteAccount()`:

Once a user is logged in, there are 8 more functionalities that the user can do inside the app, which include:
- `getContacts()`:
- `addContact(jid)`:
- `getContact(jid)`:
- `directMessage(jid, message)`:
- `createGroup(groupName)`:
- `inviteToGroup(groupName, username)`:
- `onGroupMessage(groupName, Callback)`:
- `changeStatus(show, status = "")`:


# How to use

# Author