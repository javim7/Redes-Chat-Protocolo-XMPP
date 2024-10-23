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
 */


// Importar modulos
const { client, xml } = require("@xmpp/client");
const debug = require("@xmpp/debug");
const fs = require('fs');
const path = require('path');

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
        reject(new Error("Error en conexion, intente de nuevo."));
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
    if (!this.xmpp) {
      throw new Error("Error en conexion, intente de nuevo.");
    }

    const probeStanza = this.createPresenceProbeStanza(jid);
    await this.sendPresenceProbe(probeStanza);

    return new Promise((resolve) => {
      const timeoutId = this.setPresenceTimeout(timeout, resolve);
      this.listenForPresenceStanza(jid, timeoutId, resolve, delay);
    });
  }

  createPresenceProbeStanza(jid) {
    return xml("presence", { type: "probe", to: jid });
  }

  async sendPresenceProbe(probeStanza) {
    try {
      await this.xmpp.send(probeStanza);
    } catch (err) {
      console.error("Error sending presence probe:", err);
      throw new Error("Error al enviar la solicitud de presencia.");
    }
  }

  setPresenceTimeout(timeout, resolve) {
    return setTimeout(() => {
      resolve(this.createOfflinePresence());
    }, timeout);
  }

  listenForPresenceStanza(jid, timeoutId, resolve, delay) {
    const handleStanza = (stanza) => {
      if (this.isRelevantPresenceStanza(stanza, jid)) {
        clearTimeout(timeoutId);
        const presence = this.parsePresenceStanza(stanza);
        this.xmpp.removeListener("stanza", handleStanza);
        setTimeout(() => resolve(presence), delay);
      }
    };

    this.xmpp.on("stanza", handleStanza);
  }

  isRelevantPresenceStanza(stanza, jid) {
    return stanza.is("presence") && stanza.attrs.from.split("/")[0] === jid;
  }

  parsePresenceStanza(stanza) {
    if (stanza.attrs.type === "error") {
      return this.createOfflinePresence();
    }

    const show = this.parseShowStatus(stanza.getChildText("show"));
    const status = stanza.getChildText("status");

    return { show, status };
  }

  parseShowStatus(show) {
    const statusMap = {
      "": "Available",
      "away": "Away",
      "xa": "Not Available",
      "dnd": "Busy"
    };

    return statusMap[show] || "Available";
  }

  createOfflinePresence() {
    return { show: "Offline", status: null };
  }
  
  /**
   * getContact: obtiene la informacion de un contacto en especifico.
   * @param {String} user: nombre de usuario del contacto que se desea obtener. 
   * @return {Promise}: promesa que se resuelve cuando se obtiene la informacion del contacto.
   */
  async getContact(jid) {
    if (!this.xmpp) {
      throw new Error("Error en conexión, intente de nuevo.");
    }

    const rosterStanza = this.createRosterStanza();
    await this.sendRosterStanza(rosterStanza);

    return new Promise((resolve, reject) => {
      this.handleRosterResponse(jid, resolve, reject);
    });
  }

  createRosterStanza() {
    return xml(
      'iq',
      { type: 'get', id: 'roster' },
      xml('query', { xmlns: 'jabber:iq:roster' })
    );
  }

  async sendRosterStanza(rosterStanza) {
    try {
      await this.xmpp.send(rosterStanza);
    } catch (err) {
      throw new Error('Error al enviar la solicitud de roster.');
    }
  }

  handleRosterResponse(jid, resolve, reject) {
    const handleStanza = (stanza) => {
      if (this.isRosterResultStanza(stanza)) {
        const contact = this.findContactInRoster(stanza, jid);
        this.xmpp.removeListener('stanza', handleStanza);
        
        if (contact) {
          resolve(contact);
        } else {
          reject(new Error(`No se encontró un contacto con el JID ${jid}.`));
        }
      }
    };

    this.xmpp.on('stanza', handleStanza);
  }

  isRosterResultStanza(stanza) {
    return stanza.is('iq') && 
           stanza.attrs.type === 'result' && 
           stanza.getChild('query', 'jabber:iq:roster');
  }

  findContactInRoster(stanza, jid) {
    const query = stanza.getChild('query', 'jabber:iq:roster');
    const contacts = query.getChildren('item');

    for (const contact of contacts) {
      if (contact.attrs.jid === jid) {
        return this.createContactObject(contact);
      }
    }

    return null;
  }

  createContactObject(contact) {
    const jid = contact.attrs.jid;
    const name = contact.attrs.name || jid;
    const subscription = contact.attrs.subscription;
    const presence = this.xmpp.presences && this.xmpp.presences[jid];
    const status = presence && presence.status ? presence.status : 'Offline';

    return { jid, name, subscription, status };
  }
  
  /**
   * addContact: agrega un nuevo contacto al roster.
   * @param {string} jid: nombre de usuario del contacto que se desea agregar.
   * @return {Promise}: promesa que se resuelve cuando se agrega el contacto.
   */
  async addContact(jid) {
    return new Promise(async (resolve, reject) => {
      if (!this.xmpp) {
        reject(new Error("E."));
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
      throw new Error("E.");
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
      throw new Error("E.");
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
    if (!this.xmpp) {
      throw new Error("Error en la conexion, intenta de nuevo.");
    }
    
    // stanza pra crear el grupo
    const presence = xml(
      'presence',
      { to: `${groupName}/${this.username}` },
      xml('x', { xmlns: 'https://jabber.org/protocol/muc' })
    );
    await this.xmpp.send(presence);
    
    //configurar el grupo para que se puedan unir los invitados
    const iq = xml(
      'iq',
      { type: 'set', to: groupName },
      xml(
        'query',
        { xmlns: 'https://jabber.org/protocol/muc#owner' },
        xml(
          'x',
          { xmlns: 'jabber:x:data', type: 'submit' },
          [
            xml(
              'field',
              { var: 'FORM_TYPE', type: 'hidden' },
              xml('value', {}, 'https://jabber.org/protocol/muc#roomconfig')
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
        { xmlns: 'https://jabber.org/protocol/muc#user' },
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
        xml('x', { xmlns: 'https://jabber.org/protocol/muc' })
      );
      await this.xmpp.send(presence);
  
      // obtener mensajes viejos del grupo
      const oldMessages = this.retrieveGroupChatHistory(groupJid);
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
    // stanza to receive messages from a group
    this.xmpp.on('stanza', async (stanza) => {
      if (stanza.is('message') && stanza.attrs.type === 'groupchat') {
        const from = stanza.attrs.from.split('/')[1];
        const body = stanza.getChildText('body');
        if (from && body && !from.startsWith(this.username)) {
          if (body.startsWith('File sent: ')) {
            // Decodificar el archivo recibido
            const parts = body.substring(11).split(':');
            const fileName = parts[0];
            const fileBase64 = parts[1];
            const file = Buffer.from(fileBase64, 'base64');

            // guardar el archivo en el directorio ./received_files
            const saveDir = './received_files';
            fs.writeFileSync(path.join(saveDir, fileName), file);
            console.log(`${nombre}: Envio un archivo: ${fileName}`)
            console.log(`Archivo guardado en: ${saveDir}/${fileName}`);

          } else {
            callback(from, body);
          }
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
      throw new Error("E.");
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
        xml('x', { xmlns: 'https://jabber.org/protocol/muc' })
      );
      this.xmpp.send(presence);
      console.log(`Invitación de grupo de ${fromJid} aceptada.`);
    } else {
      const message = xml(
        'message',
        { from: userJid, to: groupJid },
        xml(
          'x',
          { xmlns: 'https://jabber.org/protocol/muc#user' },
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
      throw new Error("E.");
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
        reject(new Error("E."));
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
   * sendFile: envia un archivo, codificado en base 64 a un usuario.
   * @param {String} jid: destinatario
   * @param {String} filePath : ruta del archivo
   */
  async sendFile(jid, filePath, isGroupChat = false) {
    if (!this.xmpp) {
      throw new Error("Error en la conexion, intenta de nuevo.");
    }
  
    // leer el archivo y codificarlo en base 64
    const file = fs.readFileSync(filePath);
    const fileBase64 = file.toString('base64');
  
    // obtener el nombre original del archivo
    const fileName = path.basename(filePath);
  
    // enviar el archivo codificado en base 64 y el nombre original
    const messageStanza = xml(
      "message",
      { type: isGroupChat ? "groupchat" : "chat", to: jid },
      xml("body", {}, 'File sent: ' + fileName + ':' + fileBase64)
    );
    await this.xmpp.send(messageStanza);
  }    

  /**
   * listenForStanzas: escucha los mensajes entrantes y los anade a la lista de notificaciones.
   */
  listenForStanzas() {
    if (!this.xmpp) {
      throw new Error("Error en conexión, intente de nuevo.");
    }

    this.xmpp.on("stanza", this.handleStanza.bind(this));
  }

  handleStanza(stanza) {
    if (!this.receiveNotifications) return;

    const handlers = {
      message: this.handleMessageStanza.bind(this),
      presence: this.handlePresenceStanza.bind(this)
    };

    const handler = handlers[stanza.name];
    if (handler) {
      handler(stanza);
    }
  }

  handleMessageStanza(stanza) {
    const type = stanza.attrs.type;
    const from = stanza.attrs.from;
    const body = stanza.getChildText("body");

    const messageHandlers = {
      chat: this.handleChatMessage.bind(this),
      headline: this.handleHeadlineMessage.bind(this),
      groupchat: this.handleGroupChatMessage.bind(this)
    };

    const handler = messageHandlers[type];
    if (handler && body) {
      handler(from, body);
    } else if (from.includes("@conference")) {
      this.handleGroupInvitation(from);
    }
  }

  handlePresenceStanza(stanza) {
    if (stanza.attrs.type === "subscribe") {
      this.handleFriendRequest(stanza.attrs.from);
    }
  }

  handleChatMessage(from, body) {
    const truncatedBody = this.truncateMessage(body);
    console.log(`Nuevo mensaje de ${from.split("@")[0]}: ${truncatedBody}`);
  }

  handleHeadlineMessage(from, body) {
    console.log(`Nuevo mensaje de ${from.split("@")[0]}: ${body}`);
  }

  handleGroupChatMessage(from, body) {
    const [groupname, jid] = from.split("@");
    const truncatedBody = this.truncateMessage(body);
    console.log(`Nuevo mensaje de ${jid} en grupo ${groupname}: ${truncatedBody}`);
  }

  handleGroupInvitation(from) {
    const groupName = from.split("@")[0];
    const message = `Nueva invitación de grupo de: ${groupName}`;
    console.log(message);
    this.notifications.add(message);
  }

  handleFriendRequest(from) {
    const username = from.split("@")[0];
    const message = `Nueva solicitud de amistad de: ${username}`;
    console.log(message);
    this.notifications.add(message);
  }

  truncateMessage(message, maxLength = 40) {
    return message.length > maxLength ? `${message.substring(0, maxLength)}...` : message;
  }

}

module.exports = Client;
