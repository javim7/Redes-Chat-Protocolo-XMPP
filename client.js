/**
 * client.js: cliente de mensajeria instantanea que soporta el protocolo XMPP.
 * Este archivo es el responsable de poder conectarse a alumchat.xyz y poder realizar todas las funcionalidades del chat.
 *
 * @author Javier Mombiela
 * @contact mom20067@uvg.edu.gt
 * @created 2023-07-25
 * 
 * @requires xmpp/client
 * @requires xmpp/debug
 * @requires fs
 * @requires path
 * @requires url
 * @requires https
 * @requires readline
 */

const { client, xml } = require("@xmpp/client");
const debug = require("@xmpp/debug");
const fs = require('fs');
const path = require('path');
const url = require('url');
const https = require('https');

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
    this.notifications = new Set();
    this.receiveNotifications = true;

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
      this.listenForStanzas();
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
        console.log('Error al eliminar la cuenta.');
      });
    });
  }   

  /**
   * getContacts: obtiene la lista de contactos del usuario.
   * @returns lista de contactos
   */
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

  /**
   * getPresence: obtiene el estado de presencia de un contacto.
   * @param {string} jid 
   * @returns show, status
   */
  async getPresence(jid, timeout = 2000, delay = 500) {
    return new Promise((resolve, reject) => {
      if (!this.xmpp) {
        reject(new Error("Error en conexion, intente de nuevo."));
      }
  
      const probeStanza = xml(
        "presence",
        { type: "probe", to: jid }
      );
  
      this.xmpp
        .send(probeStanza)
        .then(() => {
          // console.log("Presence probe sent successfully");
        })
        .catch((err) => {
          console.error("Error sending presence probe:", err);
          reject(new Error("Error al enviar la solicitud de presencia."));
        });
  
      const timeoutId = setTimeout(() => {
        reject(new Error("Timeout al recibir la presencia del servidor."));
      }, timeout);
  
      let presence = null;
  
      this.xmpp.on("stanza", (stanza) => {
        if (stanza.is("presence")) {
          // console.log("Received presence stanza:", stanza.toString());
          const from = stanza.attrs.from;
          const fromJid = from.split("/")[0];
          if (fromJid === jid) {
            clearTimeout(timeoutId);
            if (stanza.attrs.type === "unavailable") {
              presence = { show: "unavailable", status: null };
            } else {
              let show = stanza.getChildText("show");
              const status = stanza.getChildText("status");
  
              // Only set presence if show or status is present
              if (show || status) {
                // console.log("show:", show)
                if(show === null || show === undefined || show === "") {
                  show = "Available";
                }
                else if(show === "away"){
                  show = "Away";
                } else if(show === "xa"){
                  show = "Not Available";
                } else if(show === "dnd"){
                  show = "Busy";
                } else if (show === "unavailable") {
                  show = "Offline";
                }
                presence = { show, status };
              }
            }
          }
        } else if (stanza.is("iq") && stanza.attrs.type === "error") {
          console.log("Received error stanza:", stanza.toString());
          clearTimeout(timeoutId);
          reject(new Error("Error al recibir la presencia del servidor."));
        }
      });
  
      setTimeout(() => {
        resolve(presence || { show: "Available", status: null });
      }, delay);
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
                console.log(subscription)
  
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
   * @param {string} jid: nombre de usuario del contacto que se desea agregar.
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
   * handleContactRequests: acepta o elimina solicitudes de amistad pendientes.
   * @param {String} fromJid: nombre de usuario del contacto que envió la solicitud.
   * @param {Boolean} accept: true si se acepta la solicitud, false si se elimina.
   */
  async handleContactRequest(fromJid, accept) {
    let fromJId2 = fromJid + "@" + this.domain;
    if (!this.xmpp) {
      throw new Error("Error in connection, please try again.");
    }
    
    const stanza = Array.from(this.notifications).find(notification =>
      notification.includes(`Nueva solicitud de amistad de: ${fromJid}`)
    );

    if (accept) {
      const presence = xml('presence', { to: fromJId2, type: 'subscribed' });
      this.xmpp.send(presence);
      console.log(`\nSolicitud de amistad de ${fromJid} aceptada.`);
    } else {
      const presence = xml('presence', { to: fromJId2, type: 'unsubscribed' });
      this.xmpp.send(presence);
      console.log(`\nSolicitud de amistad de ${fromJid} eliminada.`);
    }

    if (stanza) {
      this.notifications.delete(stanza);
    }

  }  

  async getContactRequests() {
    if (!this.xmpp) {
      throw new Error("Error in connection, please try again.");
    }
  
    const presenceStanzas = Array.from(this.notifications).filter(notification =>
      notification.includes("Nueva solicitud de amistad de:")
    );
  
    return presenceStanzas;
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
  
  /**
   * chatMessage: envía un mensaje a un grupo.
   * @param {string} groupName : nombre del grupo al que se desea enviar el mensaje.
   * @param {string} mensaje : mensaje que se desea enviar.
   */
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
   * @param {string} groupName: nombre del grupo que se desea crear.
   */
  async createGroup(groupName) {
    // const mucJid = `${groupName}@conference.${this.domain}`;
  
    const presence = xml(
      'presence',
      { to: `${groupName}/${this.username}` },
      xml('x', { xmlns: 'http://jabber.org/protocol/muc' })
    );
    await this.xmpp.send(presence);
    
    //configurar el grupo para que se puedan unir los invitados
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
   * @param {string} groupName : nombre del grupo al que se desea invitar.
   * @param {string} username : nombre de usuario del usuario que se desea invitar.
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
   * @param {String} roomJid 
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

    } catch (err) {
      console.log('Error:', err.message);
    }
  }
  
  /**
   * retrieveGroupChatHistory: recupera el historial de mensajes de un grupo.
   * @param {String} groupJid : JID of the group chat
   * @returns 
   */
  async retrieveGroupChatHistory(groupJid) {
    const disco = await this.xmpp.discoverServices();
    const mamService = disco.find(
      service => service.discoInfo.features.includes('urn:xmpp:mam:2')
    );
    if (!mamService) {
      throw new Error('No MAM service found');
    }
  
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
   * @param {String} groupName: nombre del grupo
   * @param {function} callback: funcion que se ejecuta cuando se recibe un mensaje de grupo
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
   * handleGroupInvite: acepta o rechaza una invitacion a un grupo.
   * @param {String} fromJid : Jid del grupo
   * @param {Boolean} accept: ver si se acepto o no la invitacion
   */
  async handleGroupInvite(fromJid, accept) {
    if (!this.xmpp) {
      throw new Error("Error in connection, please try again.");
    }
  
    const stanza = Array.from(this.notifications).find(notification =>
      notification.includes(`Nueva invitación de grupo de: ${fromJid}`)
    );
  
    if (accept) {
      const presence = xml('presence', { to: fromJid, type: 'subscribed' });
      this.xmpp.send(presence);
      console.log(`Invitación de grupo de ${fromJid} aceptada.`);
    } else {
      const presence = xml('presence', { to: fromJid, type: 'unsubscribed' });
      this.xmpp.send(presence);
      console.log(`Invitación de grupo de ${fromJid} eliminada.`);
    }
  
    if (stanza) {
      this.notifications.delete(stanza);
    }
  }  

  /**
   * getInviteRequests: obtiene las invitaciones a grupos.
   * @param {Array} invites: lista de invitaciones a grupos
   */
  async getInviteRequests() {
    if (!this.xmpp) {
      throw new Error("Error in connection, please try again.");
    }
  
    const invites = Array.from(this.notifications).filter(notification =>
      notification.includes("Nueva invitación de grupo de:")
    );
  
    return invites;
  }

  /**
   * changeStatus: cambia el estado de presencia del usuario.
   * @param {String} show: available, away, xa, dnd, chat
   * @param {String} status: mensaje de estado
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
  
      this.xmpp.send(statusStanza).then(() => {
        console.log(`\nCambio de presencia enviado.`);
        resolve();
      }).catch((err) => {
        console.error('Error:', err);
        reject(err);
      });
    });
  }   

  /**
   * sendFile: envia un archivo a un usuario.
   * @param {String} to: destinatario
   * @param {String} filePath : ruta del archivo
   */
  async sendFile(destinatario, filePath) {
    if (!this.xmpp) {
      throw new Error("Error en la conexion, intenta de nuevo.");
    }

    // Read the file data
    const fileData = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const fileSize = fileData.byteLength;

    // Request a slot from the server
    const slot = await this.requestSlot(fileName, fileSize);

    // Upload the file to the server
    await this.uploadFile(slot, fileData);

    // Send the URL to the recipient
    const messageStanza = xml(
      "message",
      { type: "chat", to: destinatario },
      xml("body", {}, `Archivo enviado: ${slot.get.url}`),
      xml(
        "x",
        { xmlns: "jabber:x:oob" },
        xml("url", {}, slot.get.url),
        xml("desc", {}, fileName)
      )
    );

    await this.xmpp.send(messageStanza);
  }

  async requestSlot(fileName, fileSize) {
    console.log("entro")
    return new Promise((resolve, reject) => {
      const iqStanza = xml(
        'iq',
        { type: 'get', to: 'upload.alumchat.xyz' },
        xml('request', { xmlns: 'urn:xmpp:http:upload:0', filename: fileName, size: fileSize })
      );
  
      this.xmpp.send(iqStanza)
        .then((result) => {
          console.log('Raw response:', result); // Debug output
  
          const slot = result.getChild('slot', 'urn:xmpp:http:upload:0');
          if (slot) {
            resolve(slot);
          } else {
            reject(new Error('No se pudo obtener el slot del servidor.'));
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }  

  async uploadFile(slot, fileData) {
    return new Promise((resolve, reject) => {
      const putUrl = slot.getChild("put").attrs.url;
      const options = url.parse(putUrl);
      options.method = "PUT";
      options.headers = {
        "Content-Type": "application/octet-stream",
        "Content-Length": fileData.byteLength,
      };

      const req = https.request(options, (res) => {
        if (res.statusCode === 201) {
          resolve();
        } else {
          reject(new Error(`Error al subir el archivo. Codigo de estado: ${res.statusCode}`));
        }
      });

      req.on("error", (err) => {
        reject(err);
      });

      req.write(fileData);
      req.end();
    });
  } 

  /**
   * listenForStanzas: escucha los mensajes entrantes y los anade a la lista de notificaciones.
   */
  listenForStanzas() {
    if (!this.xmpp) {
      throw new Error("Error in connection, please try again.");
    }
  
    this.xmpp.on("stanza", (stanza) => {
      if (stanza.is("message") && this.receiveNotifications) {
        // console.log(stanza.toString());
        const type = stanza.attrs.type;
        const from = stanza.attrs.from;
        const body = stanza.getChildText("body");
  
        if (type === "chat" && body) {
          console.log(`Nuevo mensaje de ${from.split("@")[0]}: ${body}`);
        } else if (type === "groupchat" && body) {
          const jid = from.split("/")[1];
          const groupname = from.split("@")[0];
          console.log(`Nuevo mensaje de ${jid} en grupo ${groupname}: ${body}`);
        } else if (from.includes("@conference")) {
          console.log(`Nueva invitación de grupo de: ${from.split("@")[0]}`);
          this.notifications.add(`Nueva invitación de grupo de: ${from.split("@")[0]}`);
        }
      } else if (stanza.is("presence") && stanza.attrs.type === "subscribe") {
        console.log(`Nueva solicitud de amistad de: ${stanza.attrs.from.split("@")[0]}`);
        this.notifications.add(`Nueva solicitud de amistad de: ${stanza.attrs.from.split("@")[0]}`);
      }
    });
  }  

}

module.exports = Client;