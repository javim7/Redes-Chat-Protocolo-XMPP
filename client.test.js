const Client = require('./client');
const { xml } = require('@xmpp/client');
const fs = require('fs');
const path = require('path');

// Mockear el módulo @xmpp/client para evitar conexiones reales
jest.mock('@xmpp/client', () => ({
  client: jest.fn(),
  xml: jest.requireActual('@xmpp/client').xml,
}));

describe('Client', () => {
  let client;

  beforeEach(() => {
    client = new Client();
    // Mockear los métodos del cliente XMPP
    client.xmpp = {
      send: jest.fn().mockResolvedValue(),
      on: jest.fn(),
      removeListener: jest.fn(),
      emit: jest.fn(), // Añadimos esta línea
    };
    // Limpiar las notificaciones antes de cada prueba
    client.notifications = new Set();
    client.receiveNotifications = true;
  });

  describe('getPresence', () => {
    it('debería devolver presencia online cuando el usuario está disponible', async () => {
      const jid = 'user@example.com';
      const mockPresenceStanza = xml(
        'presence',
        { from: jid },
        xml('show', {}, 'chat'),
        xml('status', {}, 'Estoy disponible')
      );

      client.xmpp.on.mockImplementation((event, callback) => {
        if (event === 'stanza') {
          setTimeout(() => callback(mockPresenceStanza), 100);
        }
      });

      const result = await client.getPresence(jid);

      expect(result).toEqual({
        show: 'Available',
        status: 'Estoy disponible'
      });
      expect(client.xmpp.send).toHaveBeenCalledWith(expect.any(Object));
    });

    it('debería devolver presencia offline cuando no se recibe respuesta', async () => {
      const jid = 'user@example.com';

      client.xmpp.on.mockImplementation(() => {});

      const result = await client.getPresence(jid, 500);

      expect(result).toEqual({
        show: 'Offline',
        status: null
      });
      expect(client.xmpp.send).toHaveBeenCalledWith(expect.any(Object));
    });

    it('debería manejar stanza de presencia de error', async () => {
      const jid = 'user@example.com';
      const mockErrorStanza = xml(
        'presence',
        { from: jid, type: 'error' }
      );

      client.xmpp.on.mockImplementation((event, callback) => {
        if (event === 'stanza') {
          setTimeout(() => callback(mockErrorStanza), 100);
        }
      });

      const result = await client.getPresence(jid);

      expect(result).toEqual({
        show: 'Offline',
        status: null
      });
      expect(client.xmpp.send).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('getContact', () => {
    it('debería devolver información del contacto cuando el contacto existe', async () => {
      const jid = 'user@example.com';
      
      const mockRosterStanza = xml(
        'iq',
        { type: 'result', id: 'roster' },
        xml('query', { xmlns: 'jabber:iq:roster' },
          xml('item', { 
            jid: jid,
            name: 'Usuario de Prueba',
            subscription: 'both'
          })
        )
      );

      client.xmpp.on.mockImplementation((event, callback) => {
        if (event === 'stanza') {
          setTimeout(() => callback(mockRosterStanza), 100);
        }
      });

      const result = await client.getContact(jid);

      expect(result).toEqual({
        jid: jid,
        name: 'Usuario de Prueba',
        subscription: 'both',
        status: 'Offline'
      });
      
      expect(client.xmpp.send).toHaveBeenCalledWith(expect.any(Object));
    });

    it('debería lanzar un error cuando el contacto no existe', async () => {
      const jid = 'noexiste@example.com';
      
      const mockRosterStanza = xml(
        'iq',
        { type: 'result', id: 'roster' },
        xml('query', { xmlns: 'jabber:iq:roster' })
      );

      client.xmpp.on.mockImplementation((event, callback) => {
        if (event === 'stanza') {
          setTimeout(() => callback(mockRosterStanza), 100);
        }
      });

      await expect(client.getContact(jid)).rejects.toThrow(`No se encontró un contacto con el JID ${jid}.`);
      
      expect(client.xmpp.send).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('listenForStanzas', () => {
    beforeEach(() => {
      console.log = jest.fn();
    });

    it('debería manejar stanza de mensaje de chat', () => {
      const chatStanza = xml(
        'message',
        { type: 'chat', from: 'sender@example.com' },
        xml('body', {}, '¡Hola, mundo!')
      );

      client.listenForStanzas();
      const stanzaHandler = client.xmpp.on.mock.calls[0][1];
      stanzaHandler(chatStanza);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Nuevo mensaje de sender: ¡Hola, mundo!'));
    });

    it('debería manejar stanza de mensaje de chat grupal', () => {
      const groupChatStanza = xml(
        'message',
        { type: 'groupchat', from: 'room@conference.example.com/sender' },
        xml('body', {}, 'Mensaje de grupo')
      );

      client.listenForStanzas();
      const stanzaHandler = client.xmpp.on.mock.calls[0][1];
      stanzaHandler(groupChatStanza);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Nuevo mensaje de conference.example.com/sender en grupo room: Mensaje de grupo'));
    });

    it('debería manejar solicitud de suscripción de presencia', () => {
      const subscriptionStanza = xml(
        'presence',
        { type: 'subscribe', from: 'amigo@example.com' }
      );

      client.listenForStanzas();
      const stanzaHandler = client.xmpp.on.mock.calls[0][1];
      stanzaHandler(subscriptionStanza);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Nueva solicitud de amistad de: amigo'));
      expect(client.notifications.size).toBe(1);
      expect(client.notifications.has('Nueva solicitud de amistad de: amigo')).toBe(true);
    });

    it('debería manejar invitación a grupo', () => {
      const invitationStanza = xml(
        'message',
        { from: 'sala@conference.example.com' },
        xml('x', { xmlns: 'https://jabber.org/protocol/muc#user' },
          xml('invite', { from: 'invitador@example.com' })
        )
      );

      client.listenForStanzas();
      const stanzaHandler = client.xmpp.on.mock.calls[0][1];
      stanzaHandler(invitationStanza);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Nueva invitación de grupo de: sala'));
      expect(client.notifications.size).toBe(1);
      expect(client.notifications.has('Nueva invitación de grupo de: sala')).toBe(true);
    });

    it('no debería manejar stanzas cuando receiveNotifications es falso', () => {
      client.receiveNotifications = false;
      const chatStanza = xml(
        'message',
        { type: 'chat', from: 'sender@example.com' },
        xml('body', {}, '¡Hola, mundo!')
      );

      client.listenForStanzas();
      const stanzaHandler = client.xmpp.on.mock.calls[0][1];
      stanzaHandler(chatStanza);

      expect(console.log).not.toHaveBeenCalled();
    });
  });

//   describe('sendFile', () => {
//     beforeEach(() => {
//       // Mockear fs.readFileSync
//       fs.readFileSync = jest.fn().mockReturnValue(Buffer.from('mock file content'));
//     });

//     it('debería enviar un archivo correctamente', async () => {
//       const jid = 'user@example.com';
//       const filePath = '/path/to/mockfile.txt';
//       const isGroupChat = false;

//       await client.sendFile(jid, filePath, isGroupChat);

//       // Verificar que fs.readFileSync fue llamado con la ruta correcta
//       expect(fs.readFileSync).toHaveBeenCalledWith(filePath);

//       // Verificar que xmpp.send fue llamado con la stanza correcta
//       expect(client.xmpp.send).toHaveBeenCalledWith(
//         expect.objectContaining({
//           name: 'message',
//           attrs: {
//             type: 'chat',
//             to: jid
//           },
//           children: [
//             expect.objectContaining({
//               name: 'body',
//               children: [expect.stringContaining('File sent: mockfile.txt:')]
//             })
//           ]
//         })
//       );
//     });

//     it('debería enviar un archivo a un grupo correctamente', async () => {
//       const groupJid = 'group@conference.example.com';
//       const filePath = '/path/to/mockfile.txt';
//       const isGroupChat = true;

//       await client.sendFile(groupJid, filePath, isGroupChat);

//       expect(fs.readFileSync).toHaveBeenCalledWith(filePath);
//       expect(client.xmpp.send).toHaveBeenCalledWith(
//         expect.objectContaining({
//           name: 'message',
//           attrs: {
//             type: 'groupchat',
//             to: groupJid
//           },
//           children: [
//             expect.objectContaining({
//               name: 'body',
//               children: [expect.stringContaining('File sent: mockfile.txt:')]
//             })
//           ]
//         })
//       );
//     });

//     it('debería lanzar un error si no hay conexión XMPP', async () => {
//       client.xmpp = null;
//       const jid = 'user@example.com';
//       const filePath = '/path/to/mockfile.txt';

//       await expect(client.sendFile(jid, filePath)).rejects.toThrow('Error en la conexion, intenta de nuevo.');
//     });
//   });

  describe('getContacts', () => {
    it('debería obtener la lista de contactos correctamente', async () => {
      const mockRosterStanza = xml(
        'iq',
        { type: 'result', id: 'roster' },
        xml('query', { xmlns: 'jabber:iq:roster' },
          xml('item', { jid: 'contact1@example.com', name: 'Contact 1', subscription: 'both' }),
          xml('item', { jid: 'contact2@example.com', name: 'Contact 2', subscription: 'to' })
        )
      );

      client.xmpp.on.mockImplementation((event, callback) => {
        if (event === 'stanza') {
          setTimeout(() => callback(mockRosterStanza), 100);
        }
      });

      const contacts = await client.getContacts();

      expect(client.xmpp.send).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'iq',
          attrs: {
            type: 'get',
            id: 'roster'
          },
          children: [
            expect.objectContaining({
              name: 'query',
              attrs: {
                xmlns: 'jabber:iq:roster'
              }
            })
          ]
        })
      );

      expect(contacts).toEqual([
        { jid: 'contact1@example.com', name: 'Contact 1', subscription: 'both', status: 'Offline' },
        { jid: 'contact2@example.com', name: 'Contact 2', subscription: 'to', status: 'Offline' }
      ]);
    });

    it('debería manejar un error si no hay conexión XMPP', async () => {
      client.xmpp = null;
      await expect(client.getContacts()).rejects.toThrow('Error en conexion, intente de nuevo.');
    });

    it('debería manejar un error al enviar la solicitud de roster', async () => {
      client.xmpp.send.mockRejectedValueOnce(new Error('Error al enviar la solicitud de roster.'));
      await expect(client.getContacts()).rejects.toThrow('Error al enviar la solicitud de roster.');
    });
  });

  describe('createGroup', () => {
    it('debería crear un grupo correctamente', async () => {
      const groupName = 'testGroup@conference.alumchat.xyz';
      const username = 'testuser';

      // Configurar el cliente
      client.username = username;
      
      // Esperar las llamadas a xmpp.send
      const sendSpy = jest.spyOn(client.xmpp, 'send').mockResolvedValue();

      // Llamar a la función createGroup
      await client.createGroup(groupName);

      // Verificar que se enviaron las stanzas correctas
      expect(sendSpy).toHaveBeenCalledTimes(3);

      // Verificar la stanza de presencia
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'presence',
          attrs: { to: `${groupName}/${username}` },
          children: [
            expect.objectContaining({
              name: 'x',
              attrs: { xmlns: 'https://jabber.org/protocol/muc' }
            })
          ]
        })
      );

      // Verificar la stanza de configuración
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'iq',
          attrs: { type: 'set', to: groupName },
          children: [
            expect.objectContaining({
              name: 'query',
              attrs: { xmlns: 'https://jabber.org/protocol/muc#owner' },
              children: [
                expect.objectContaining({
                  name: 'x',
                  attrs: { xmlns: 'jabber:x:data', type: 'submit' },
                  children: expect.arrayContaining([
                    expect.objectContaining({
                      name: 'field',
                      attrs: { var: 'muc#roomconfig_membersonly' },
                      children: [
                        expect.objectContaining({
                          name: 'value',
                          children: ['1']
                        })
                      ]
                    })
                  ])
                })
              ]
            })
          ]
        })
      );

      // Verificar el mensaje de bienvenida
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'message',
          attrs: { type: 'groupchat', to: groupName },
          children: [
            expect.objectContaining({
              name: 'body',
              children: [`Bienvenidos al grupo ${groupName}.`]
            })
          ]
        })
      );

      // Restaurar el mock
      sendSpy.mockRestore();
    });

    it('debería lanzar un error si no hay conexión XMPP', async () => {
      client.xmpp = null;
      const groupName = 'testGroup@conference.alumchat.xyz';

      await expect(client.createGroup(groupName)).rejects.toThrow('Error en la conexion, intenta de nuevo.');
    });
  });
});
