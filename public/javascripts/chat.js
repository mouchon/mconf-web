var Chat = {
    connection: null,
    full_name: null,

    jid_to_id: function (jid) {
        return Strophe.getBareJidFromJid(jid)
            .replace(/@/, "-")
            .replace(/\./g, "-");
    },

    on_roster: function (iq) {
        $(iq).find('item').each(function () {
            var jid = $(this).attr('jid');
            var name = $(this).attr('name') || jid;

            // transform jid into an id
            var jid_id = Chat.jid_to_id(jid);

            var contact = $("<li id='" + jid_id + "' class='offline'>" +
                            "<div class='roster-contact'>" +
                            "<div class='roster-name'>" +
                            name +
                            "</div><div class='roster-jid hidden'>" +
                            jid +
                            "</div></div></li>");

            Chat.insert_contact(contact);
        });

        // set up presence handler and send initial presence
        Chat.connection.addHandler(Chat.on_presence, null, "presence");

        Chat.connection.send($pres());
    },

    pending_subscriber: null,

    on_presence: function (presence) {
        var ptype = $(presence).attr('type');
        var from = $(presence).attr('from');
        var jid_id = Chat.jid_to_id(from);
        var on = $(presence).attr('on');

        if (ptype === 'subscribe') {
            // populate pending_subscriber, the approve-jid span, and
            // open the dialog
            var name = $(presence).attr('name');
            Chat.pending_subscriber = from;
            $('#approve-jid').text(name);
            $('#approve_dialog').dialog('open');
        }
        if (ptype === 'subscribed') {
            Chat.connection.send($pres({
                to: from,
                "type": "subscribed", "on": "yes"}));
        }
        if (on === 'yes') {
            Chat.connection.send($pres());
        }
        else if (ptype !== 'error') {
            var contact = $('#roster-area #' + jid_id)
                .removeClass("online")
                .removeClass("busy")
                .removeClass("away")
                .removeClass("offline");

            if (ptype === 'unavailable') {
                contact.addClass("offline");
            } else {
                var show = $(presence).find("show").text();
                if (show === "" || show === "chat") {
                    contact.addClass("online");
                } else {
                    if (show == "dnd") {
                        contact.addClass("busy");
                    } else {
                        contact.addClass("away");
                    }
                }
            }

            var li = contact;
            li.remove();
            Chat.insert_contact(li);
        }

        // reset addressing for user since their presence changed
        var jid_id = Chat.jid_to_id(from);
        $('#chat-' + jid_id).data('jid', Strophe.getBareJidFromJid(from));

        return true;
    },

    on_roster_changed: function (iq) {
        $(iq).find('item').each(function () {
            var sub = $(this).attr('subscription');
            var jid = $(this).attr('jid');
            var name = $(this).attr('name') || jid;
            var jid_id = Chat.jid_to_id(jid);

            if (sub === 'remove') {
                // contact is being removed
                $('#' + jid_id).remove();
            } else {
                // contact is being added or modified
                var contact_html = "<li id='" + jid_id + "' class='" + ($('#' + jid_id).attr('class') || "offline") + "'>" +
                    "<div class='roster-contact'>" +
                    "<div class='roster-name'>" +
                    name +
                    "</div><div class='roster-jid hidden>" +
                    jid +
                    "</div></div></li>";

                if ($('#' + jid_id).length > 0) {
                    $('#' + jid_id).replaceWith(contact_html);
                } else {
                    Chat.insert_contact($(contact_html));
                }
            }
        });

        return true;
    },

    on_message: function (message) {
        var full_jid = $(message).attr('from');
        var jid = Strophe.getBareJidFromJid(full_jid);
        var jid_id = Chat.jid_to_id(jid);
        var name = $(message).attr('name');

        if ($('#chat-' + jid_id).length === 0) {
            $('#chat-area').tabs('add', '#chat-' + jid_id, name);
            $('#chat-' + jid_id).append(
                "<div class='chat-messages'></div>" +
                    "<input type='text' class='chat-input'>");
        }

        $('#chat-' + jid_id).data('jid', full_jid);

        $('#chat-area').tabs('select', '#chat-' + jid_id);
        $('#chat-' + jid_id + ' input').focus();

        var composing = $(message).find('composing');
        if (composing.length > 0) {
            $('#chat-' + jid_id + ' .chat-messages').append(
                "<div class='chat-event'>" + name + " is typing...</div>");

            Chat.scroll_chat(jid_id);
        }

        var body = $(message).find("html > body");

        if (body.length === 0) {
            body = $(message).find('body');
            if (body.length > 0) {
                body = body.text()
            } else {
                body = null;
            }
        } else {
            body = body.contents();

            var span = $("<span></span>");
            body.each(function () {
                if (document.importNode) {
                    $(document.importNode(this, true)).appendTo(span);
                } else {
                    // IE workaround
                    span.append(this.xml);
                }
            });

            body = span;
        }

        if (body) {
            // remove notifications since user is now active
            $('#chat-' + jid_id + ' .chat-event').remove();

            // add the new message
            $('#chat-' + jid_id + ' .chat-messages').append(
                "<div class='chat-message'>" +
                "&lt;<span class='chat-name'>" + name +
                "</span>&gt;<span class='chat-text'> " +
                    "</span></div>");

            $('#chat-' + jid_id + ' .chat-message:last .chat-text')
                .append(body);

            Chat.scroll_chat(jid_id);
        }

        return true;
    },

    scroll_chat: function (jid_id) {
        var div = $('#chat-' + jid_id + ' .chat-messages').get(0);
        if(div) div.scrollTop = div.scrollHeight;
    },


    presence_value: function (elem) {
        if (elem.hasClass('online')) {
            return 3;
        } else {
            if (elem.hasClass('busy')) {
                return 2;
            } else {
                if(elem.hasClass('away')) {
                    return 1;
                }
            }
        }

        return 0;
    },

    insert_contact: function (elem) {
        var jid = elem.find('.roster-jid').text();
        var pres = Chat.presence_value(elem);

        var contacts = $('#roster-area li');

        if (contacts.length > 0) {
            var inserted = false;
            contacts.each(function () {
                var cmp_pres = Chat.presence_value($(this));
                var cmp_jid = $(this).find('.roster-jid').text();

                if (pres > cmp_pres) {
                    $(this).before(elem);
                    inserted = true;
                    return false;
                } else if (pres === cmp_pres) {
                    if (jid < cmp_jid) {
                        $(this).before(elem);
                        inserted = true;
                        return false;
                    }
                }
            });

            if (!inserted) {
                $('#roster-area ul').append(elem);
            }
        } else {
            $('#roster-area ul').append(elem);
        }
    }
};

$(document).ready(function () {

    $('#approve_dialog').dialog({
        autoOpen: false,
        draggable: false,
        modal: true,
        title: 'Subscription Request',
        buttons: {
            "Deny": function () {
                Chat.connection.send($pres({
                    to: Chat.pending_subscriber,
                    "type": "unsubscribed"}));
                Chat.pending_subscriber = null;

                $(this).dialog('close');
            },

            "Approve": function () {
                var iq = $iq({type: "set"}).c("query", {xmlns: "jabber:iq:roster"})
                    .c("item", { jid: Chat.pending_subscriber, name: $('#approve-jid').text()});
                Chat.connection.sendIQ(iq);

                Chat.connection.send($pres({
                    to: Chat.pending_subscriber,
                    "type": "subscribed"}));

                Chat.pending_subscriber = null;

                $(this).dialog('close');
            }
        }
    });

    $('#chat-area').tabs().find('.ui-tabs-nav').sortable({axis: 'x'});

    $('.roster-contact').live('click', function () {
        var jid = $(this).find(".roster-jid").text();
        var name = $(this).find(".roster-name").text();
        var jid_id = Chat.jid_to_id(jid);

        if ($('#chat-' + jid_id).length === 0) {
            $('#chat-area').tabs('add', '#chat-' + jid_id, name);
            $('#chat-' + jid_id).append(
                "<div class='chat-messages'></div>" +
                "<input type='text' class='chat-input'>");
            $('#chat-' + jid_id).data('jid', jid);
        }
        $('#chat-area').tabs('select', '#chat-' + jid_id);

        $('#chat-' + jid_id + ' input').focus();
    });

    $('.chat-input').live('keypress', function (ev) {
        var jid = $(this).parent().data('jid');

        if (ev.which === 13) {
            ev.preventDefault();

            var body = $(this).val();

            var message = $msg({to: jid,
                                "type": "chat", "name": Chat.full_name})
                .c('body').t(body).up()
                .c('active', {xmlns: "http://jabber.org/protocol/chatstates"});

            Chat.connection.send(message);

            $(this).parent().find('.chat-messages').append(
                "<div class='chat-message'>&lt;" +
                    "<span class='chat-name me'>" +
                    Chat.full_name +
                    "</span>&gt;<span class='chat-text'> " +
                    body +
                    "</span></div>");

            Chat.scroll_chat(Chat.jid_to_id(jid));

            $(this).val('');
            $(this).parent().data('composing', false);
        } else {
            var composing = $(this).parent().data('composing');
            if (!composing) {
                var notify = $msg({to: jid, "type": "chat", "name": Chat.full_name})
                    .c('composing', {xmlns: "http://jabber.org/protocol/chatstates"});
                Chat.connection.send(notify);

                $(this).parent().data('composing', true);
            }
        }
    });
});

$(document).bind('connect', function (ev, data) {
    var conn = new Strophe.Connection('http://chat-bottin.no-ip.info:5280/http-bind');

    conn.connect(data.login, data.password, function (status) {
        if (status === Strophe.Status.CONNECTED) {
            Chat.full_name = data.name;
            $(document).trigger('connected');
        } else if (status === Strophe.Status.DISCONNECTED) {
            $(document).trigger('disconnected');
        }
    });

    Chat.connection = conn;
});

$(document).bind('connected', function () {
    var iq = $iq({type: 'get'}).c('query', {xmlns: 'jabber:iq:roster'});
    Chat.connection.sendIQ(iq, Chat.on_roster);

    Chat.connection.addHandler(Chat.on_roster_changed,
                              "jabber:iq:roster", "iq", "set");

    Chat.connection.addHandler(Chat.on_message,
                              null, "message", "chat");
});

$(document).bind('disconnected', function () {
    Chat.connection = null;
    Chat.full_name = null;
    Chat.pending_subscriber = null;

    $('#roster-area ul').empty();
    $('#chat-area ul').empty();
    $('#chat-area div').remove();

    $('#login_dialog').dialog('open');
});

$(document).bind('contact_added', function (ev, data) {
    var iq = $iq({type: "set"}).c("query", {xmlns: "jabber:iq:roster"})
        .c("item", data);

    Chat.connection.sendIQ(iq);
    var subscribe = $pres({to: data.jid, "type": "subscribe", "name": data.inviter});
    Chat.connection.send(subscribe);
});

$(document).bind('change_status', function (ev, data) {
    if(data.status == "offline") {
        Chat.connection.disconnect();
        Chat.connection = null;
        Chat.full_name = null;
        $("#chat_status_dnd").addClass("hidden");
        $("#chat_status_away").addClass("hidden");
    }
    else {
        if(data.status == "online" && !Chat.connection) {
            $(document).trigger('connect',{login: data.login,password: data.password,name: data.name});
            $("#chat_status_dnd").removeClass("hidden");
            $("#chat_status_away").removeClass("hidden");
        }
        else {
            var status = $pres().c('show').t(data.status);
            Chat.connection.send(status);
        }
    }
});