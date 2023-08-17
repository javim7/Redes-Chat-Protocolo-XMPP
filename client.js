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
 */


// Importar modulos
const { client, xml } = require("@xmpp/client");
const debug = require("@xmpp/debug");
const fs = require('fs');
const path = require('path');
const url = require('url');
const https = require('https');
const mime = require('mime-types');

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
   * @return {Promise}: promesa que se resuelve cuando el usuario se ha registrado correctamente.
   */
  async register(username, password, email) {
    return new Promise(async (resolve, reject) => {
      if (this.xmpp) {
        reject(new Error('Ya existe una conexión.'));
      }
      
      // Crear cliente XMPP
      this.username = username;
      this.password = password;
      this.xmpp = client({
        service: this.service,
        domain: this.domain,
        username: this.username,
        password: this.password,
      });
      
      // Evento para recibir la respuesta del servidor
      try {
        await this.xmpp.start();
      } catch (err) {
        reject(new Error('Error al establecer la conexión.'));
      }
      
      // creando la stanza
      const registerStanza = xml(
        'iq',
        { type: 'set', id: 'register' },
        xml('query', { xmlns: 'jabber:iq:register' },
          xml('username', {}, username),
          xml('password', {}, password),
          xml('email', {}, email)
        )
      );
      
      // Enviar la stanza al servidor
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
    // Crear cliente XMPP
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
    
    // Evento para recibir la respuesta del servidor y conectarse
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

    // se para la conexion y se reestablecen los valores
    await this.xmpp.stop();
    this.xmpp = null;
    this.username = null;
    this.password = null;
  }

  /**
   * deleteAccount: elimina la cuenta del usuario del servidor.
   * @return {Promise}: promesa que se resuelve cuando el usuario se ha eliminado correctamente.
   */
  async deleteAccount() {
    return new Promise((resolve, reject) => {
      if (!this.xmpp) {
        reject(new Error("Error in connection, please try again."));
      }
      
      // creando la stanza para eliminar cuenta
      const deleteStanza = xml(
        'iq',
        { type: 'set', id: 'delete' },
        xml('query', { xmlns: 'jabber:iq:register' },
          xml('remove')
        )
      );
        
      // Enviar la stanza al servidor
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
   * @return {Promise}: promesa que se resuelve cuando se obtiene la lista de contactos.
   */
  async getContacts() {
    return new Promise((resolve, reject) => {
      if (!this.xmpp) {
        reject(new Error("Error en conexion, intente de nuevo."));
      }
      
      // creando la stanza para obtener los contactos
      const rosterStanza = xml(
        'iq',
        { type: 'get', id: 'roster' },
        xml('query', { xmlns: 'jabber:iq:roster' })
      );
        
      // Enviar la stanza al servidor
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
   * @return {Promise}: promesa que se resuelve cuando se obtiene el estado de presencia.
   */
  async getPresence(jid, timeout = 2000, delay = 500) {
    return new Promise((resolve, reject) => {
      if (!this.xmpp) {
        reject(new Error("Error en conexion, intente de nuevo."));
      }
      
      // creando la stanza para obtener el estado de presencia
      const probeStanza = xml(
        "presence",
        { type: "probe", to: jid }
      );
        
      // Enviar la stanza al servidor
      this.xmpp
        .send(probeStanza)
        .then(() => {
        })
        .catch((err) => {
          console.error("Error sending presence probe:", err);
          reject(new Error("Error al enviar la solicitud de presencia."));
        });
  
      const timeoutId = setTimeout(() => {
        reject(new Error("Timeout al recibir la presencia del servidor."));
      }, timeout);
  
      let presence = null;
      
      // Evento para recibir la respuesta del servidor y llenar datos de contacto
      this.xmpp.on("stanza", (stanza) => {
        if (stanza.is("presence")) {
          // console.log("Received presence stanza:", stanza.toString());
          const from = stanza.attrs.from;
          const fromJid = from.split("/")[0];
          if (fromJid === jid) {
            clearTimeout(timeoutId);
            if (stanza.attrs.type === "error") {
              presence = { show: "Offline", status: null };
            } else {
              let show = stanza.getChildText("show");
              const status = stanza.getChildText("status");
  
              // ver si hay un estado de presencia
              if (show || status) {
                // if para cambiar el estado de presencia a un string
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
              } else{
                presence = { show: "Available", status: null };
              }
            }
          }
        } 
      });
      
      // si no se recibe respuesta del servidor, se envia un objeto vacio
      setTimeout(() => {
        resolve(presence || { show: "Offline", status: null });
      }, delay);
    });
  }  
  
  /**
   * getContact: obtiene la informacion de un contacto en especifico.
   * @param {String} user: nombre de usuario del contacto que se desea obtener. 
   * @return {Promise}: promesa que se resuelve cuando se obtiene la informacion del contacto.
   */
  async getContact(jid) {
    return new Promise((resolve, reject) => {
      if (!this.xmpp) {
        reject(new Error("Error en conexion, intente de nuevo."));
      }
      
      // creando la stanza para obtener los contactos
      const rosterStanza = xml(
        'iq',
        { type: 'get', id: 'roster' },
        xml('query', { xmlns: 'jabber:iq:roster' })
      );
        
      // Enviar la stanza al servidor
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
            
            // si no se encuentra el contacto, se envia un error
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
   * @return {Promise}: promesa que se resuelve cuando se agrega el contacto.
   */
  async addContact(jid) {
    return new Promise(async (resolve, reject) => {
      if (!this.xmpp) {
        reject(new Error("Error in connection, please try again."));
      }
      
      // Crear la stanza para agregar el contacto
      const addStanza = xml(
        'iq',
        { type: 'set', id: 'add' },
        xml('query', { xmlns: 'jabber:iq:roster' },
          xml('item', { jid: jid })
        )
      );
        
      // Enviar la stanza al servidor
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
    
    // Buscar la stanza de la solicitud de amistad
    const stanza = Array.from(this.notifications).find(notification =>
      notification.includes(`Nueva solicitud de amistad de: ${fromJid}`)
    );

    // if para recibir o rechazar la solicitud con sus debidas stanzas
    if (accept) {
      const presence = xml('presence', { to: fromJId2, type: 'subscribed' });
      this.xmpp.send(presence);
      console.log(`\nSolicitud de amistad de ${fromJid} aceptada.`);
    } else {
      const presence = xml('presence', { to: fromJId2, type: 'unsubscribed' });
      this.xmpp.send(presence);
      console.log(`\nSolicitud de amistad de ${fromJid} eliminada.`);
    }

    // Eliminar la stanza de la solicitud de amistad
    if (stanza) {
      this.notifications.delete(stanza);
    }

  }  

  /**
   * getContactRequests: obtiene las solicitudes de amistad pendientes.
   * @returns {Array} presenceStanzas: lista de stanzas de solicitudes de amistad.
   */
  async getContactRequests() {
    if (!this.xmpp) {
      throw new Error("Error in connection, please try again.");
    }
    
    // Obtener las stanzas de las solicitudes de amistad
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

    // Crear la stanza del mensaje
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
   * @param {string} message : mensaje que se desea enviar.
   */
  async chatMessage(groupName, message) {
    if (!this.xmpp) {
      throw new Error("Error en la conexion, intenta de nuevo.");
    }

    // Crear la stanza del mensaje de chat
    const messageStanza = xml(
      "message",
      { type: "groupchat", to: groupName },
      xml("body", {}, message)
    );

    await this.xmpp.send(messageStanza);
  }

  /**
   * createGroup: crea un nuevo grupo.
   * @param {string} groupName: nombre del grupo que se desea crear.
   */
  async createGroup(groupName) {
    
    // stanza pra crear el grupo
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
  
    // mandar mensaje de bienvenida
    const message = "Bienvenidos al grupo " + groupName + ".";
    await this.chatMessage(groupName, message);
  }  
  
  /**
   * inviteToGroup: invita a un usuario a unirse a un grupo.
   * @param {string} groupName : nombre del grupo al que se desea invitar.
   * @param {string} username : nombre de usuario del usuario que se desea invitar.
   */
  async inviteToGroup(groupName, username) {
    // stanza para invitar al usuario
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
    // enviar la stanza
    await this.xmpp.send(invite);
  }  

  /**
   * joinGroupChat: se une a un grupo existente.
   * @param {String} roomJid 
   */
  async joinGroup(groupJid) {
    try {
      // stanza para unirse a un grupo existente
      const presence = xml(
        'presence',
        { to: `${groupJid}/${this.username}` },
        xml('x', { xmlns: 'http://jabber.org/protocol/muc' })
      );
      await this.xmpp.send(presence);
  
      // obtener mensajes viejos del grupo
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
   * @return {Array} messages : lista de mensajes del grupo.
   */
  async retrieveGroupChatHistory(groupJid) {
    // obtener el servicio MAM
    const disco = await this.xmpp.discoverServices();
    const mamService = disco.find(
      service => service.discoInfo.features.includes('urn:xmpp:mam:2')
    );
    if (!mamService) {
      throw new Error('No MAM service found');
    }
    
    // obtener los mensajes del grupo
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
    // enviar la stanza
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
    // stanza para recibir mensajes de un grupo
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
    const groupJid = fromJid + "@conference." + this.domain;
    const userJid = this.username + "@" + this.domain;
  
    // stanza to accept or reject a group invitation
    const stanza = Array.from(this.notifications).find(notification =>
      notification.includes(`Nueva invitación de grupo de: ${fromJid}`)
    );
  
    // accept or reject the invitation
    if (accept) {
      const presence = xml(
        'presence',
        { from: userJid, to: groupJid },
        xml('x', { xmlns: 'http://jabber.org/protocol/muc' })
      );
      this.xmpp.send(presence);
      console.log(`Invitación de grupo de ${fromJid} aceptada.`);
    } else {
      const message = xml(
        'message',
        { from: userJid, to: groupJid },
        xml(
          'x',
          { xmlns: 'http://jabber.org/protocol/muc#user' },
          xml(
            'decline',
            { to: fromJid },
            xml('reason', {}, 'Sorry, I cannot join right now.')
          )
        )
      );
      this.xmpp.send(message);
      console.log(`Invitación de grupo de ${fromJid} eliminada.`);
    }
  
    // remove the notification
    if (stanza) {
      this.notifications.delete(stanza);
    }
  }    

  /**
   * getInviteRequests: obtiene las invitaciones a grupos.
   * @param {Array} invites: lista de invitaciones a grupos
   * @returns {Array} invites: lista de invitaciones a grupos
   */
  async getInviteRequests() {
    if (!this.xmpp) {
      throw new Error("Error in connection, please try again.");
    }
    // obtener las invitaciones a grupos
    const invites = Array.from(this.notifications).filter(notification =>
      notification.includes("Nueva invitación de grupo de:")
    );
  
    return invites;
  }

  /**
   * changeStatus: cambia el estado de presencia del usuario.
   * @param {String} show: available, away, xa, dnd, chat
   * @param {String} status: mensaje de estado
   * @return {Promise} promise: promesa de cambio de estado
   */
  async changeStatus(show, status = "") {
    return new Promise((resolve, reject) => {
      if (!this.xmpp) {
        reject(new Error("Error in connection, please try again."));
      }
      
      // stanza para cambiar el estado de presencia
      const statusStanza = xml(
        "presence",
        {},
        xml("show", {}, show),
        xml("status", {}, status)
      );
        
      // enviar la stanza
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
   * @param {String} jid: destinatario
   * @param {String} filePath : ruta del archivo
   * @return {Promise} promise: promesa de envio de archivo
   */
  async sendFile(jid, filePath) {
    if (!this.xmpp) {
      throw new Error("Error en la conexion, intenta de nuevo.");
    }
  
    // Check if the server supports HTTP File Upload
    const uploadService = await this.discoverUploadService();
    if (!uploadService) {
      throw new Error('HTTP File Upload not supported by server');
    }
  
    // Read the file and get its size and type
    const file = fs.readFileSync(filePath);
    const fileSize = fs.statSync(filePath).size;
    const fileType = mime.lookup(filePath);
  
    // Request a slot from the server
    const slot = await this.requestSlot(uploadService, filePath, fileSize, fileType);
  
    // Upload the file to the server
    await this.uploadFile(slot.putUrl, file, fileType);
  
    // Send the URL of the uploaded file to the recipient
    const messageStanza = xml(
      "message",
      { type: "chat", to: jid },
      xml("body", {}, 'File sent: ' + slot.getUrl)
    );
    await this.xmpp.send(messageStanza);
  }
  
  async discoverUploadService() {
    const stanza = xml(
      'iq',
      { type: 'get', id: 'disco1' },
      xml('query', { xmlns: 'http://jabber.org/protocol/disco#items' })
    );
    const response = await this.xmpp.send(stanza);
    const services = response.getChild('query').getChildren('item').map(item => item.attrs.jid);
    for (const service of services) {
      const stanza = xml(
        'iq',
        { type: 'get', to: service, id: 'disco2' },
        xml('query', { xmlns: 'http://jabber.org/protocol/disco#info' })
      );
      const response = await this.xmpp.send(stanza);
      const identities = response.getChild('query').getChildren('identity');
      for (const identity of identities) {
        if (identity.attrs.category === 'store' && identity.attrs.type === 'file') {
          return service;
        }
      }
    }
  }
  
  async requestSlot(service, fileName, fileSize, fileType) {
    const stanza = xml(
      'iq',
      { type: 'get', to: service, id: 'request-slot' },
      xml('request', { xmlns: 'urn:xmpp:http:upload:0', filename: fileName, size: fileSize, 'content-type': fileType })
    );
    const response = await this.xmpp.send(stanza);
    const slot = response.getChild('slot', 'urn:xmpp:http:upload:0');
    return {
      putUrl: slot.getChildText('put'),
      getUrl: slot.getChildText('get')
    };
  }
  
  async uploadFile(url, data, contentType) {
    return new Promise((resolve, reject) => {
      const options = url.parse(url);
      options.method = 'PUT';
      options.headers = {
        'Content-Type': contentType,
        'Content-Length': data.length
      };
      const req = https.request(options, res => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Failed to upload file. Status code: ${res.statusCode}`));
        }
      });
      req.on('error', err => reject(err));
      req.write(data);
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
    
    //definimos el largo maximo para los mensajes
    const maxLength = 40;

    // escuchando las stanzas entrantes
    this.xmpp.on("stanza", (stanza) => {
      // stanzas de mensaje, solo la de invitacion se agrega a la lista
      if (stanza.is("message") && this.receiveNotifications) {
        // console.log(stanza.toString());
        const type = stanza.attrs.type;
        const from = stanza.attrs.from;
        let body = stanza.getChildText("body");
  
        if (type === "chat" && body) {
          //vemos si el mensaje es muy largo
          if (body.length > maxLength) {
            body = body.substring(0, maxLength) + "...";
          }

          console.log(`Nuevo mensaje de ${from.split("@")[0]}: ${body}`);
        } else if (type === "groupchat" && body) {
          const jid = from.split("/")[1];
          const groupname = from.split("@")[0];
          //vemos si el mensaje es muy largo
          if (body.length > maxLength) {
            body = body.substring(0, maxLength) + "...";
          }
          console.log(`Nuevo mensaje de ${jid} en grupo ${groupname}: ${body}`);
        } else if (from.includes("@conference")) {
          console.log(`Nueva invitación de grupo de: ${from.split("@")[0]}`);
          this.notifications.add(`Nueva invitación de grupo de: ${from.split("@")[0]}`);
        }
      } else if (stanza.is("presence") && stanza.attrs.type === "subscribe") {
        // solicitudes de amistad
        console.log(`Nueva solicitud de amistad de: ${stanza.attrs.from.split("@")[0]}`);
        this.notifications.add(`Nueva solicitud de amistad de: ${stanza.attrs.from.split("@")[0]}`);
      }
    });
  }  

}

module.exports = Client;