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
  }

  /**
   * register: registra un nuevo usuario en el servidor.
   * @param {String} username 
   * @param {String} password 
   */
  async register(username, password, email) {
    if (this.xmpp && this.xmpp.status === "online") {
      throw new Error("You are already connected. Cannot register while connected.");
    }

    const registerStanza = xml(
      "iq",
      { type: "set" },
      xml("query", { xmlns: "jabber:iq:register" }, [
        xml("username", {}, username),
        xml("password", {}, password),
        xml("email", {}, email),
      ])
    );

    this.xmpp = client({
      service: this.service,
      domain: this.domain,
      username: username,
      password: password,
    });

    this.xmpp.on("online", async () => {
      await this.xmpp.send(xml("presence"));
    });

    try {
      await this.xmpp.start();
      await this.xmpp.send(registerStanza);
    }
    catch (err) {
      if (err.condition === 'conflict') {
        throw new Error('\nEl usuario ya existe!');
      } else {
        throw err;
      }
    }
    finally {
      await this.xmpp.stop();
      this.xmpp = null;
    }
  }

  /**
   * login: conecta al cliente XMPP al servidor.
   * @param {String} username
   * @param {String} password
   */
  async login(username, password) {
    this.xmpp = client({
      service: this.service,
      domain: this.domain,
      username: username,
      password: password,
    });
  
    this.xmpp.on("online", async () => {
      await this.xmpp.send(xml("presence"));
    });
  
    try {
      await this.xmpp.start();
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

  async getContacts() {
    if (!this.xmpp) {
      throw new Error("Error in connection, please try again.");
    }

    const rosterStanza = xml(
      "iq",
      { type: "get" },
      xml("query", { xmlns: "jabber:iq:roster" })
    );

    try {
      const response = await this.xmpp.send(rosterStanza);

      console.log("Roster Response:", response.toString()); // Log the raw response

      // Set the correct namespace for parsing the response
      const contacts = response.getChild("query", "jabber:iq:roster").getChildren("item");

      return contacts.map((contact) => {
        return {
          jid: contact.attrs.jid,
          name: contact.attrs.name,
          subscription: contact.attrs.subscription,
        };
      });
    } catch (err) {
      throw new Error("Error fetching contacts:", err.message);
    }
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

  async changeStatus(show, status = "") {
    if (!this.xmpp) {
      throw new Error("Error en la conexion, intenta de nuevo.");
    }

    const statusStanza = xml(
      "presence",
      {},
      xml("show", {}, show),
      xml("status", {}, status)
    );

    await this.xmpp.send(statusStanza);
  }
}

module.exports = Client;

// async function ejemplogetContacts() {
//   const cliente = new Client();
//   cliente.username = "mom20067";
//   cliente.password = "varcelona";
//   await cliente.connect();

//   const contacts = await cliente.getContacts();
//   console.log(contacts);
// }

// ejemplogetContacts().catch((error) => {
//   console.error("Error al obtener contactos:", error);
// });