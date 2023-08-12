/**
 * client.js: cliente de mensajeria instantanea que soporta el protocolo XMPP.
 * Este archivo es el responsable de poder conectarse a alumchat.xyz y poder realizar todas las funcionalidades del chat.
 *
 * @author Javier Mombiela
 * @contact mom20067@uvg.edu.gt
 * @created 2023-07-25
 * @requires xmpp/client
 * @requires xmpp/debug
 */

const { client, xml } = require("@xmpp/client");
const debug = require("@xmpp/debug");
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { v4: uuidv4 } = require('uuid');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/**
 * Client: clase que representa al cliente XMPP y todas sus funcionalidades.
 */
class Client {
  constructor() {
    this.username = null;
    this.password = null;
    this.service = "xmpp://alumchat.xyz:5222";
    this.domain = "alumchat.xyz";
    this.xmpp = null;
    this.notifictions = [];

  }

  /**
   * register: registra un nuevo usuario en el servidor.
   * @param {String} username 
   * @param {String} password 
   */
  async register(username, password, email) {
    return new Promise(async (resolve, reject) => {
      if (this.xmpp) {
        reject(new Error('Ya existe una conexión.'));
      }
  
      this.username = username;
      this.password = password;
      this.xmpp = client({
        service: this.service,
        domain: this.domain,
        username: this.username,
        password: this.password,
      });
  
      try {
        await this.xmpp.start();
      } catch (err) {
        reject(new Error('Error al establecer la conexión.'));
      }
  
      const registerStanza = xml(
        'iq',
        { type: 'set', id: 'register' },
        xml('query', { xmlns: 'jabber:iq:register' },
          xml('username', {}, username),
          xml('password', {}, password),
          xml('email', {}, email)
        )
      );
  
      this.xmpp.send(registerStanza).then(() => {
        resolve();
      }).catch((err) => {
        reject(new Error('Error al registrar el usuario.'));
      });
    });
  }   

  /**
   * login: conecta al cliente XMPP al servidor.
   * @param {String} username
   * @param {String} password
   */
  async login(username, password) {
    this.username = username;
    this.password = password;
    this.xmpp = client({
      service: this.service,
      domain: this.domain,
      username: this.username,
      password: this.password,
    });
  
    this.xmpp.on("online", async () => {
      await this.xmpp.send(xml("presence"));
    });
  
    try {
      await this.xmpp.start();
      this.handleStanza();
    } catch (err) {
      if (err.condition === 'not-authorized') {
        throw new Error('\nCredenciales incorrectas! Intente de nuevo.');
      } else {
        throw err;
      }
    }
  }

  /**
   * logout: desconecta al cliente XMPP del servidor.
   */
  async logout() {
    if (!this.xmpp) {
      throw new Error("Error en la conexion, intenta de nuevo.");
    }

    await this.xmpp.stop();
    this.xmpp = null;
    this.username = null;
    this.password = null;
  }

  /**
   * deleteAccount: elimina la cuenta del usuario del servidor.
   */
  async deleteAccount() {
    return new Promise((resolve, reject) => {
      if (!this.xmpp) {
        reject(new Error("Error in connection, please try again."));
      }
  
      const deleteStanza = xml(
        'iq',
        { type: 'set', id: 'delete' },
        xml('query', { xmlns: 'jabber:iq:register' },
          xml('remove')
        )
      );
  
      this.xmpp.send(deleteStanza).then(async () => {
        await this.xmpp.stop();
        this.xmpp = null;
        this.username = null;
        this.password = null;
        resolve();
      }).catch((err) => {
        reject(new Error('Error al eliminar la cuenta.'));
      });
  
      this.xmpp.on('error', (err) => {
        // Handle any errors that might occur
      });
    });
  }   

  async getContacts() {
    return new Promise((resolve, reject) => {
      if (!this.xmpp) {
        reject(new Error("Error en conexion, intente de nuevo."));
      }
  
      const rosterStanza = xml(
        'iq',
        { type: 'get', id: 'roster' },
        xml('query', { xmlns: 'jabber:iq:roster' })
      );
  
      this.xmpp.send(rosterStanza).catch((err) => {
        reject(new Error('Error al enviar la solicitud de roster.'));
      });
  
      // Evento para recibir la respuesta del roster del servidor
      this.xmpp.on('stanza', (stanza) => {
        if (stanza.is('iq') && stanza.attrs.type === 'result') {
          const query = stanza.getChild('query', 'jabber:iq:roster');
          if (query) {
            const contacts = query.getChildren('item');
  
            let contactList = [];
            contacts.forEach((contact) => {
              const jid = contact.attrs.jid;
              const name = contact.attrs.name || jid;
              const subscription = contact.attrs.subscription;
  
              // Obtener el estado de presencia del contacto (si está disponible)
              const presence = this.xmpp.presences && this.xmpp.presences[jid];
              const status = presence && presence.status ? presence.status : 'Offline';
  
              contactList.push({jid, name, subscription, status});
            });
  
            resolve(contactList);
          }
        }
      });
    });
  }  

  updatePresence(jid, show, status) {
    if (!this.xmpp.presences) {
      this.xmpp.presences = {};
    }
    if (!this.xmpp.presences[jid]) {
      this.xmpp.presences[jid] = {};
    }
    this.xmpp.presences[jid].show = show;
    this.xmpp.presences[jid].status = status;
  }

  async getPresence(jid) {
    return new Promise((resolve, reject) => {
      if (!this.xmpp) {
        reject(new Error("Error en conexion, intente de nuevo."));
      }
  
      const probeStanza = xml(
        'presence',
        { type: 'probe', to: jid }
      );
  
      this.xmpp.send(probeStanza).then(() => {
      }).catch((err) => {
        console.error('Error sending presence probe:', err);
        reject(new Error('Error al enviar la solicitud de presencia.'));
      });
      this.xmpp.on('stanza', (stanza) => {
        if (stanza.is('presence')) {
          // console.log("hola")
          const from = stanza.attrs.from;
          const jid = from.split('/')[0];
          const show = stanza.getChildText('show');
          const status = stanza.getChildText('status');
          // this.updatePresence(jid, show, status);
          resolve({show, status});
        }
      });
    });
  }  
  
  /**
   * getContact: obtiene la informacion de un contacto en especifico.
   * @param {String} user: nombre de usuario del contacto que se desea obtener. 
   * @returns 
   */
  async getContact(jid) {
    return new Promise((resolve, reject) => {
      if (!this.xmpp) {
        reject(new Error("Error en conexion, intente de nuevo."));
      }
  
      const rosterStanza = xml(
        'iq',
        { type: 'get', id: 'roster' },
        xml('query', { xmlns: 'jabber:iq:roster' })
      );
  
      this.xmpp.send(rosterStanza).catch((err) => {
        reject(new Error('Error al enviar la solicitud de roster.'));
      });
  
      // Evento para recibir la respuesta del roster del servidor
      this.xmpp.on('stanza', (stanza) => {
        if (stanza.is('iq') && stanza.attrs.type === 'result') {
          const query = stanza.getChild('query', 'jabber:iq:roster');
          if (query) {
            const contacts = query.getChildren('item');
  
            let contactList = [];
            contacts.forEach((contact) => {
              if (contact.attrs.jid === jid) {
                const jid = contact.attrs.jid;
                const name = contact.attrs.name || jid;
                const subscription = contact.attrs.subscription;
  
                // Obtener el estado de presencia del contacto (si está disponible)
                const presence = this.xmpp.presences && this.xmpp.presences[jid];
                const status = presence && presence.status ? presence.status : 'Offline';
  
                contactList.push({jid, name, subscription, status});
              }
            });
  
            if (contactList.length === 0) {
              reject(new Error(`No se encontró un contacto con el JID ${jid}.`));
            } else {
              resolve(contactList[0]);
            }
          }
        }
      });
    });
  }  

  /**
   * addContact: agrega un nuevo contacto al roster.
   * @param jid 
   * @param nombre 
   */

  async addContact(jid) {
    return new Promise(async (resolve, reject) => {
      if (!this.xmpp) {
        reject(new Error("Error in connection, please try again."));
      }
  
      const addStanza = xml(
        'iq',
        { type: 'set', id: 'add' },
        xml('query', { xmlns: 'jabber:iq:roster' },
          xml('item', { jid: jid })
        )
      );
  
      this.xmpp.send(addStanza).then(async () => {
        // Enviar una solicitud de suscripción al contacto
        const presenceStanza = xml(
          'presence',
          { type: 'subscribe', to: jid }
        );
        await this.xmpp.send(presenceStanza);

        //enviar mensaje incial
        const message = "Hello, I am " + this.username + ".";
        await this.directMessage(jid, message);
        
        resolve();
      }).catch((err) => {
        reject(new Error('Error al agregar el contacto.'));
      });
    });
  }  

  /**
   * directMessage: envía un mensaje a un destinatario.
   * @param destinatario: nombre de usuario del destinatario.
   * @param mensaje: mensaje que se desea enviar.
   */
  async directMessage(destinatario, mensaje) {
    if (!this.xmpp) {
      throw new Error("Error en la conexion, intenta de nuevo.");
    }

    const messageStanza = xml(
      "message",
      { type: "chat", to: destinatario },
      xml("body", {}, mensaje)
    );

    await this.xmpp.send(messageStanza);
  }
  
  async chatMessage(groupName, mensaje) {
    if (!this.xmpp) {
      throw new Error("Error en la conexion, intenta de nuevo.");
    }

    const messageStanza = xml(
      "message",
      { type: "groupchat", to: groupName },
      xml("body", {}, mensaje)
    );

    await this.xmpp.send(messageStanza);
  }

  /**
   * createGroup: crea un nuevo grupo.
   * @param {*} groupName 
   */
  async createGroup(groupName) {
    // const mucJid = `${groupName}@conference.${this.domain}`;
  
    // Create the MUC room
    const presence = xml(
      'presence',
      { to: `${groupName}/${this.username}` },
      xml('x', { xmlns: 'http://jabber.org/protocol/muc' })
    );
    await this.xmpp.send(presence);
  
    // Configure the MUC room
    const iq = xml(
      'iq',
      { type: 'set', to: groupName },
      xml(
        'query',
        { xmlns: 'http://jabber.org/protocol/muc#owner' },
        xml(
          'x',
          { xmlns: 'jabber:x:data', type: 'submit' },
          [
            xml(
              'field',
              { var: 'FORM_TYPE', type: 'hidden' },
              xml('value', {}, 'http://jabber.org/protocol/muc#roomconfig')
            ),
            xml(
              'field',
              { var: 'muc#roomconfig_membersonly' },
              xml('value', {}, '1')
            ),
          ]
        )
      )
    );
    await this.xmpp.send(iq);
  
    // Send a welcome message
    const message = "Bienvenidos al grupo " + groupName + ".";
    await this.chatMessage(groupName, message);
  }  
  
  /**
   * inviteToGroup: invita a un usuario a unirse a un grupo.
   * @param {*} groupName 
   * @param {*} username 
   */
  async inviteToGroup(groupName, username) {
    const invite = xml(
      'message',
      { to: groupName },
      xml(
        'x',
        { xmlns: 'http://jabber.org/protocol/muc#user' },
        xml(
          'invite',
          { to: `${username}` },
          xml('reason', {}, `Join our group: ${groupName}`)
        )
      )
    );
    await this.xmpp.send(invite);
  }  

  /**
   * joinGroupChat: se une a un grupo existente.
   * @param {*} roomJid 
   */
  async joinGroup(groupJid) {
    try {
      const presence = xml(
        'presence',
        { to: `${groupJid}/${this.username}` },
        xml('x', { xmlns: 'http://jabber.org/protocol/muc' })
      );
      await this.xmpp.send(presence);
  
      // Retrieve old messages from the group chat
      const oldMessages = await this.retrieveGroupChatHistory(groupJid);
      for (const message of oldMessages) {
        console.log(`${message.from}: ${message.body}`);
      }
  
      // this.xmpp.on('stanza', async (stanza) => {
      //   if (stanza.is('message') && stanza.getChild('body')) {
      //     if (stanza.attrs.type === "groupchat") {
      //       const from = stanza.attrs.from;
      //       const body = stanza.getChildText("body");
      //       if (from && body) {
      //         console.log(`${from}: ${body}`);
      //       }
      //     }
      //   }
      // });
    } catch (err) {
      console.log('Error:', err.message);
    }
  }
  
  async retrieveGroupChatHistory(groupJid) {
    // Discover a MAM service
    const disco = await this.xmpp.discoverServices();
    const mamService = disco.find(
      service => service.discoInfo.features.includes('urn:xmpp:mam:2')
    );
    if (!mamService) {
      throw new Error('No MAM service found');
    }
  
    // Query the MAM service for archived messages
    const iq = xml(
      'iq',
      { type: 'set', to: mamService.jid },
      xml(
        'query',
        { xmlns: 'urn:xmpp:mam:2' },
        xml('x', { xmlns: 'jabber:x:data', type: 'submit' },
          xml('field', { var: 'FORM_TYPE', type: 'hidden' },
            xml('value', {}, 'urn:xmpp:mam:2')
          ),
          xml('field', { var: 'with' },
            xml('value', {}, groupJid)
          )
        )
      )
    );
    const response = await this.xmpp.sendIq(iq);
    const forwardedMessages = response.getChild('fin').getChildren('forwarded');
    return forwardedMessages.map(forwarded => {
      const message = forwarded.getChild('message');
      const from = message.attrs.from;
      const body = message.getChildText('body');
      return { from, body };
    });
  }  

  /**
   * onGroupMessage: recibe un mensaje de un grupo.
   * @param {*} groupName: nombre del grupo
   * @param {*} callback: funcion que se ejecuta cuando se recibe un mensaje de grupo
   */
  onGroupMessage(groupName, callback) {
    this.xmpp.on('stanza', async (stanza) => {
      // console.log(stanza.toString)
      if (stanza.is('message') && stanza.attrs.type === 'groupchat') {
        const from = stanza.attrs.from.split('/')[1];
        const message = stanza.getChildText('body');

        if(from && message && !from.startsWith(this.username)) {
          callback(from, message);
        }
      }
    });
  }  

  /**
   * changeStatus: cambia el estado de presencia del usuario.
   * @param {*} show: available, away, xa, dnd, chat
   * @param {*} status: mensaje de estado
   * @returns 
   */
  async changeStatus(show, status = "") {
    return new Promise((resolve, reject) => {
      if (!this.xmpp) {
        reject(new Error("Error in connection, please try again."));
      }
  
      const statusStanza = xml(
        "presence",
        {},
        xml("show", {}, show),
        xml("status", {}, status)
      );
  
      // Send the IQ stanza to the server
      this.xmpp.send(statusStanza).then(() => {
        console.log(`\nCambio de presencia enviado.`);
        resolve();
      }).catch((err) => {
        console.error('Error:', err);
        reject(err);
      });
    });
  }   

  async sendFile(to, filePath) {
    // Read the file data
    const fileData = await fs.promises.readFile(filePath);
    const fileName = path.basename(filePath);
    const fileSize = fileData.length;
    const mimeType = mime.lookup(filePath);
  
    // Generate a unique session ID for the file transfer
    const sid = uuidv4();
  
    // Send a stream initiation request to the recipient
    const siStanza = xml(
      'iq',
      { type: 'set', to, id: sid },
      xml(
        'si',
        { xmlns: 'http://jabber.org/protocol/si', id: sid, profile: 'http://jabber.org/protocol/si/profile/file-transfer' },
        xml(
          'file',
          { xmlns: 'http://jabber.org/protocol/si/profile/file-transfer', name: fileName, size: fileSize },
          xml('desc', {}, `Sending file ${fileName}`),
          xml('range')
        ),
        xml(
          'feature',
          { xmlns: 'http://jabber.org/protocol/feature-neg' },
          xml(
            'x',
            { xmlns: 'jabber:x:data', type: 'form' },
            xml('field', { var: 'stream-method', type: 'list-single' },
              xml('option', {}, xml('value', {}, 'http://jabber.org/protocol/bytestreams')),
              xml('option', {}, xml('value', {}, 'http://jabber.org/protocol/ibb'))
            )
          )
        )
      )
    );
    await this.xmpp.send(siStanza);
  
    // Open an in-band bytestream to send the file data
    const blockSize = 4096;
    const openStanza = xml(
      'iq',
      { type: 'set', to, id: sid },
      xml(
        'open',
        { xmlns: 'http://jabber.org/protocol/ibb', sid, 'block-size': blockSize, stanza: 'iq' }
      )
    );
    await this.xmpp.send(openStanza);
  
    // Send the file data as a series of data packets
    let seq = 0;
    for (let i = 0; i < fileSize; i += blockSize) {
      const data = fileData.slice(i, i + blockSize);
      const dataStanza = xml(
        'iq',
        { type: 'set', to, id: sid },
        xml(
          'data',
          { xmlns: 'http://jabber.org/protocol/ibb', sid, seq },
          data.toString('base64')
        )
      );
      await this.xmpp.send(dataStanza);
      seq++;
    }
  
    // Close the in-band bytestream
    const closeStanza = xml(
      'iq',
      { type: 'set', to, id: sid },
      xml(
        'close',
        { xmlns: 'http://jabber.org/protocol/ibb', sid }
      )
    );
    await this.xmpp.send(closeStanza);
  }
  
  handleStanza() {
      this.xmpp.on('stanza', (stanza) => {
      if (stanza.is('message')) {
        const from = stanza.attrs.from;
        const jid = from.split('/')[0];
        const type = stanza.attrs.type;
        if (type === 'chat') {
          console.log(`New message from ${jid}`);
        } else if (type === 'groupchat') {
          const groupName = jid.split('@')[0];
          console.log(`${jid} sent a message in ${groupName}`);
        }
      } else if (stanza.is('presence')) {
        const from = stanza.attrs.from;
        const jid = from.split('/')[0];
        const type = stanza.attrs.type;
        if (type === 'subscribe') {
          console.log(`Contact request from ${jid}`);
          this.notifications.push({ type: 'contactRequest', from: jid });
        }
      }
    });
  }  

}

module.exports = Client;