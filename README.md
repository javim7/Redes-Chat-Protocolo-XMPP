# Name

### AlumChat

# Project Description

### General Description

The purpose of this project is to create a client in JS, `client.js` which has to able to connect to an XMPP server with the domain *@alumchat.xyz* and server port *5222*. The client has to be able to do multiple functionalities, which are the general functionalities a chat applicacion can have. The project also contains a `main.js` file, which is the controller of the program: this file is the responsible of making the client work, and it does this by calling the functions and displaying the data in a way that is more organized. 

### Introduction

AlumChat is a powerful and easy-to-use XMPP client that allows you to connect with friends, family, and colleagues in real-time. With support for one-on-one and group chats, file sharing, and more, AlumChat makes it easy to stay connected and collaborate with others. Whether you’re at home, at work, or on the go, AlumChat keeps you connected.

# Functionalities

### General Key-Features

- Real-time instant messaging with support for one-on-one and group conversations.
- Manage your contact list, send friend requests, and accept new contacts.
- Set your online status and presence message to let others know your availability.
- Receive notifications for new messages, friend requests, and group invitations.
- Accept or reject group invitations directly from the client.
- Intuitive command-line interface for easy interaction and control.
- Built on top of the robust XMPP protocol, ensuring secure and reliable communication.

### Methods used

Alumchat consists of a series of functionalities; these are all implemented as functions in the the `client.js`.

The four main functionalities the application has are the following:
- `register(username, password, email)`: creates a new account in the server.
- `login(username, password)`: logs in to an existing account.
- `logout()`: logs out from the account logged in.
- `deleteAccount()`: removes an account from the server.

Once a user is logged in, there are many more functionalities that the user can do inside the app, which include:
- `getContacts()`: retrieves a list of all the contacts in the Roster: retrieves JID, status, and status message. 
- `addContact(jid)`: adds a specified user to the roster. (Subscription will be 'both' until the other user accepts the request).
- `getContact(jid)`: retrieves all the contact information of a specified user in the roster.
- `handleContactRequest(fromJid, accept)`: accepts or rejects a friend request from a specified user.
- `directMessage(jid, message)`: sends a message of type 'chat' to a specified user.
- `chatMessage(groupName, message)`: sends a message of type 'groupchat' to a specified group.
- `createGroup(groupName)`: creates a new group with the configurations needed to be able to use it.
- `inviteToGroup(groupName, username)`: invites a specified user to a specified group already created.
- `join(groupJId)`: joins an existing group (has to be called every time you want to chat in a group).
- `handleGroupInvite(fromJid, accept)`: accepts or rejects an invitation from a specifed group.
- `changeStatus(show, status = "")`: changes the status and status message.
- `sendFile(jid, filePath)`: sends a file to a specified user. (The function uses the XEP-0363 protocol to achieve this.)
- `listenForStanzas()`: prints any incoming notifications the user may have.

As mentioned before, the `main.js` file is the responsible for controlling the client, so all these functions are in the `client.js`, but the main also has these functions, but they only call the client functions, which have all the logic in them. 

It is also important to mention, that in the `client.js` there are many more functions which weren't mentioned. These werent't mentioned because they are not part of the main functionalities, but they are important because they are all helper methods for at least one of the main functions.

# How to use

### Requirements
AlumChat requires Node.js to be installed on your system.

### Installation
To install AlumChat, follow these steps:

1. Clone the AlumChat repository to your local machine.
```bash
git clone https://github.com/javim7/Redes-Chat-Protocolo-XMPP.git
```

2. Navigate to the AlumChat directory:
```bash
cd Redes-Chat-Protocolo-XMPP
```

3. Install the dependencies:
```bash
npm install
```

### Usage
To use AlumChat, follow these steps:

1. Start the AlumChat program by running `node main.js` from the AlumChat directory.
2. Follow the on-screen prompts to register a new account or log in to an existing account.
3. Use the menu options to start chats, send files, and more.

# Author

### Javier Mombiela
#### GitHub: javim7

For questions, feedback, or support, please contact me at [rjmombiela@gmail.com](mailto:rjmombiela@gmail.com).