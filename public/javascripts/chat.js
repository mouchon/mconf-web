var Chat = {
    connection: null,
    user_name: null,
    last_status: null,
    login: null,
    password: null,
    invite_chat: null,
    invite_bbb_chat: null,
    bbb_room_url: null,

    jid_to_id: function (jid) {
        return Strophe.getBareJidFromJid(jid)
            .replace(/@/, "-")
            .replace(/\./g, "-");
    },

    on_roster: function (iq) {
        $(iq).find('item').each(function () {
            var jid = $(this).attr('jid');
            var name = $(this).attr('name') || jid;

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
        Chat.connection.addHandler(Chat.on_presence, null, "presence");

        Chat.connection.send($pres());
    },

    pending_subscriber: null,

    on_presence: function (presence) {
        var ptype = $(presence).attr('type');
        var from = $(presence).attr('from');
        var jid_id = Chat.jid_to_id(from);
        var on = $(presence).attr('on');
        var bbb = $(presence).attr('bbb');

        if(bbb === 'invite') {
            var name = $("#" + jid_id).find(".roster-name").text();
            var status = $("#" + jid_id).attr("class");

            if ($('#chat-' + jid_id).length === 0) {
                $("#chat-bar").append(
                    "<div id='mHfL' class='mHfL' style='width: 230px; height: 100%;'><div><div class='nn' style='width: 225px; height: 100%; position: absolute;'>" +
                        "<div id='chat-" + jid_id  +"' class='chat-area' style='position: absolute;'>" +
                        "<div class='chat-area-title'><h3><ul><li class='none " + status  + "'>" + name + "<img id='close-chat' src='../images/icons/close-chat.png' width='12' height='12' style='margin-top: 1px; float: right; display:inline;' /></li></ul></h3></div>" +
                        "<div id='content-chat'><div style='border-bottom: solid 1px #DDD'><img id='bbb-chat-" + jid_id + "' src='../images/icons/bbb_logo.png' class='bbb-chat-icon'/></div></br>" +
                        "<div id='message-area'><div class='chat-messages' style='word-wrap: break-word;'></div>" +
                        "<textarea class='chat-input'></textarea>" +
                        "</div></div></div></div></div></div>"
                );
                $('#chat-' + jid_id).data('jid', from);
                $('#chat-' + jid_id + ' .chat-input').autosize();
            }

            $('#chat-' + jid_id + ' #content-chat').show();
            $('#chat-' + jid_id + ' .chat-input').focus();

            var name = $("#"+jid_id+" .roster-contact .roster-name").text();
            var body = I18n.t('chat.invite.msg');
            body = body.replace(/URL/g,$(presence).attr('url'));

            $("#chat-"+jid_id).find('.chat-messages').append(
                "<div class='chat-message'>" +
                "<span class='chat-name'>" + name +
                " </span><span class='chat-text'>" + body +
                "</span></div>"
            );
        }

        if (ptype === 'subscribe') {
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
                .removeClass("dnd")
                .removeClass("away")
                .removeClass("offline");
            $("#chat-"+jid_id+" .none")
                .removeClass("online")
                .removeClass("dnd")
                .removeClass("away")
                .removeClass("offline");

            if (ptype === 'unavailable') {
                contact.addClass("offline");
                $("#chat-"+jid_id+" .none").addClass("offline");
            } else {
                var show = $(presence).find("show").text();
                if (show === "" || show === "chat") {
                    contact.addClass("online");
                    $("#chat-"+jid_id+" .none").addClass("online");
                } else {
                    if (show == "dnd") {
                        contact.addClass("dnd");
                        $("#chat-"+jid_id+" .none").addClass("dnd");
                    } else {
                        contact.addClass("away");
                        $("#chat-"+jid_id+" .none").addClass("away")
                    }
                }
            }

            var li = contact;
            li.remove();
            Chat.insert_contact(li);
        }

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
                $('#' + jid_id).remove();
            } else {
                var contact_html = "<li id='" + jid_id + "' class='" + ($('#' + jid_id).attr('class') || "offline") + "'>" +
                    "<div class='roster-contact'>" +
                    "<div class='roster-name'>" +
                    name +
                    "</div><div class='roster-jid hidden'>" +
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
        var name = $("#"+jid_id).find(".roster-name").text();
        var status = $("#" + jid_id).attr("class");

        if ($('#chat-' + jid_id).length === 0) {
            $("#chat-bar").append(
                "<div id='mHfL' class='mHfL' style='width: 230px; height: 100%;'><div><div class='nn' style='width: 225px; height: 100%; position: absolute;'>" +
                "<div id='chat-" + jid_id  +"' class='chat-area' style='position: absolute;'>" +
                "<div class='chat-area-title'><h3><ul><li class='none " + status  + "'>" + name + "<img id='close-chat' src='../images/icons/close-chat.png' width='12' height='12' style='margin-top: 1px; float: right; display:inline;' /></li></ul></h3></div>" +
                "<div id='content-chat'><div style='border-bottom: solid 1px #DDD'><img id='bbb-chat-" + jid_id + "' src='../images/icons/bbb_logo.png' class='bbb-chat-icon'/></div></br>" +
                "<div id='message-area'><div class='chat-messages' style='word-wrap: break-word;'></div>" +
                "<textarea class='chat-input'></textarea>" +
                "</div></div></div></div></div></div>"
            );
            $('#chat-' + jid_id).data('jid', jid);
            $('#chat-' + jid_id + ' .chat-input').autosize();
        }

        $('#chat-' + jid_id + ' #content-chat').show();
        $('#chat-' + jid_id + ' .chat-input').focus();

        var composing = $(message).find('composing');
        if (composing.length > 0) {
            $('#chat-' + jid_id + ' #content-chat #message-area .chat-messages').append(
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
                    span.append(this.xml);
                }
            });

            body = span;
        }

        if (body) {
            $('#chat-' + jid_id + ' #content-chat #message-area .chat-messages .chat-event').remove();

            $('#chat-' + jid_id + ' #content-chat #message-area .chat-messages').append(
                "<div class='chat-message'>" +
                "<span class='chat-name'>" + name +
                " </span><span class='chat-text'>" +
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
            if (elem.hasClass('dnd')) {
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

    $("#close-chat").live('click', function(){
        $(this).parents(".mHfL").remove();
    });

    $(".chat-area-title").live('click', function(){
        $(this).parents().children("#content-chat").toggle();
    });

    $('.roster-contact').live('click', function () {
        var jid = $(this).find(".roster-jid").text();
        var name = $(this).find(".roster-name").text();
        var jid_id = Chat.jid_to_id(jid);
        var status = $("#" + jid_id).attr("class");

        if ($('#chat-' + jid_id).length === 0) {
            $("#chat-bar").append(
                "<div id='mHfL' class='mHfL' style='width: 230px; height: 100%;'><div><div class='nn' style='width: 225px; height: 100%; position: absolute;'>" +
                "<div id='chat-" + jid_id  +"' class='chat-area' style='position: absolute;'>" +
                "<div class='chat-area-title'><h3><ul><li class='none " + status  + "'>" + name + "<img id='close-chat' src='../images/icons/close-chat.png' width='12' height='12' style='margin-top: 1px; float: right; display:inline;' /></li></ul></h3></div>" +
                "<div id='content-chat'><div style='border-bottom: solid 1px #DDD'><img id='bbb-chat-" + jid_id + "' src='../images/icons/bbb_logo.png' class='bbb-chat-icon'/></div></br>" +
                "<div id='message-area'><div class='chat-messages' style='word-wrap: break-word;'></div>" +
                "<textarea class='chat-input'></textarea>" +
                "</div></div></div></div></div></div>"
            );
            $('#chat-' + jid_id).data('jid', jid);
            $('#chat-' + jid_id + ' .chat-input').autosize();
        }

        $('#chat-' + jid_id + ' #content-chat').show();
        $('#chat-' + jid_id + ' .chat-input').focus();
    });

    $('.chat-input').live('keypress', function (ev) {
        var jid = $(this).parent().parent().parent().data('jid');
        var name = $("#status").text();

        if ((ev.which === 13) && ($(this).val().length > 0)) {
            ev.preventDefault();

            var body = $(this).val();

            var message = $msg({to: jid, "type": "chat"})
                .c('body').t(body).up()
                .c('active', {xmlns: "http://jabber.org/protocol/chatstates"});

            Chat.connection.send(message);

            $(this).parent().find('.chat-messages').append(
                "<div class='chat-message'>" +
                    "<span class='chat-name me'>" + name +
                    "</span><span class='chat-text'>" +
                    body +
                    "</span></div>");

            Chat.scroll_chat(Chat.jid_to_id(jid));

            $(this).val('');
            $(this).parent().data('composing', false);
            $(this).css("min-height","30px");
            $(this).css("max-height","30px");
            $(this).css("height","30px");
        } else {
            var composing = $(this).parent().data('composing');
            if (!composing) {
                var notify = $msg({to: jid, "type": "chat"})
                    .c('composing', {xmlns: "http://jabber.org/protocol/chatstates"});
                Chat.connection.send(notify);

                $(this).parent().data('composing', true);
            }
        }
    });

    $(".bbb-chat-icon").live('click', function () {
        var jid = $(this).parent().parent().parent().data('jid');
        var jid_id = Chat.jid_to_id(jid);
        var name = $("#status").text();
        var body = I18n.t('chat.invite.msg_sender');
        body = body.replace(/URL/g,Chat.bbb_room_url);

        Chat.connection.send($pres({to: jid, "bbb": "invite", "url": Chat.bbb_room_url}));

        $("#chat-"+jid_id).find('.chat-messages').append(
            "<div class='chat-message'>" +
            "<span class='chat-name me'>" + name +
            " </span><span class='chat-text'>" + body +
            "</span></div>"
        );
    });

    $("#status").live('click', function () {
        $("#status_list").toggle(0);
        $("#chat_status_"+Chat.last_status).removeClass("hidden");
        $("#chat_status_"+$("#status").attr('class')).addClass("hidden");
        Chat.last_status = $("#status").attr('class');
    });

    $("#status_list .chat_status").live('click', function () {
        var status = $(this).attr('class').replace("chat_status ","");
        $("#status").removeClass();
        $("#status-title").removeClass();
        $(document).trigger('change_status', {login: Chat.login, password: Chat.password, status: status,name: Chat.user_name});
        $("#status-title").addClass(status);
        $("#status").addClass(status);
        $("#status_list").toggle(0);
    });

    $("img#bbb_invite").live('click', function() {
        $.fancybox({
            hideOnContentClick : false,
            autoDimensions : false,
            href: Chat.invite_bbb_chat,
            width : 306,
            height : 140
        });
    });

    $("img#add_user").live('click', function() {
        $.fancybox({
            hideOnContentClick : false,
            autoDimensions : false,
            href: Chat.invite_chat,
            width : 306,
            height : 140
        });
    });
});

$(document).bind('connect', function (ev, data) {
    var conn = new Strophe.Connection('http://chat-bottin.no-ip.info:5280/http-bind');

    conn.connect(data.login, data.password, function (status) {
        if (status === Strophe.Status.CONNECTED) {
            Chat.user_name = data.name;
            Chat.login = data.login;
            Chat.password = data.password;
            Chat.invite_chat = data.invite_chat;
            Chat.invite_bbb_chat = data.invite_bbb_chat;
            Chat.bbb_room_url = data.url;
            $("#status").removeClass("offline").addClass("online");
            $(document).trigger('connected');
        } else if (status === Strophe.Status.DISCONNECTED) {
            $(document).trigger('disconnected');
        }
    });

    Chat.connection = conn;
});

$(document).bind('connected', function () {
    if($("#main-chat").length === 0)
    {
        $("#chat-bar").append(
            "<div class='mHfL' style='width: 200px; height: 100%;'><div><div class='nn' style='width: 195px; height: 100%; position: absolute;'>" +
            "<div id='main-chat' class='chat-area' style='position: absolute;'>" +
                "<div class='chat-area-title'><h3><ul><li id='status-title' class='none online'>" + "Web Chat"  + "</li></ul></h3></div>" +
            "<div id='content-chat'><div style='border-bottom: solid 1px #DDD;'>" +
            "<img id='add_user' src='../images/icons/user_add.png' class='chat-menu-icon' style='cursor: pointer; cursor: hand;' title='Invite Users'/>" +
            "<img id='bbb_invite' src='../images/icons/bbb_logo.png' class='chat-menu-icon' style='cursor: pointer; cursor: hand;' title='Invite users to your BBB room'/>" +
            "</div></br><ul style='margin-bottom: 0px;'>" +
            "<li id='status' class='online' style='margin-left: 5px; cursor: pointer; cursor: hand;'>" + Chat.user_name  + "</li>" +
            "<li id='status_list' class='none hidden' style='margin-left: 5px;'><ul style='cursor: pointer; cursor: hand;'>" +
            "<li id='chat_status_online' class='chat_status online'>Online</li>" +
            "<li id='chat_status_dnd' class='chat_status dnd'>Do Not Disturb</li>" +
            "<li id='chat_status_away' class='chat_status away'>Away</li>" +
            "<li id='chat_status_offline' class='chat_status offline'>Offline</li>" +
            "</ul></li></ul>" +
            "<div id='roster-area'><ul style='cursor: pointer; cursor: hand;'></ul></div>" +
            "</div></div></div></div></div>"
        );
    }

    var iq = $iq({type: 'get'}).c('query', {xmlns: 'jabber:iq:roster'});
    Chat.connection.sendIQ(iq, Chat.on_roster);

    Chat.connection.addHandler(Chat.on_roster_changed,
                              "jabber:iq:roster", "iq", "set");

    Chat.connection.addHandler(Chat.on_message,
                              null, "message", "chat");
});

$(document).bind('disconnected', function () {
    Chat.connection = null;
    Chat.pending_subscriber = null;

    $('#roster-area ul').empty();
    $('#roster-area').addClass("hidden");
    $('#main-chat #content-chat').toggle(0);
    $('#chat-bar #mHfL').remove();
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
        $("#chat_status_dnd").addClass("hidden");
        $("#chat_status_away").addClass("hidden");
    }
    else {
        if(data.status == "online" && !Chat.connection) {
            $("#roster-area").removeClass();
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

$(document).bind('send_bbb', function (ev, data) {
    $.each(data.jid, function(index){
        Chat.connection.send($pres({to: data.jid[index], "bbb": "invite", "url": Chat.bbb_room_url}));
/*        var body = I18n.t('chat.invite.msg', {locale: data.locale[index]});
        body.replace(/URL/g, Chat.bbb_room_url);

        alert(body);

        var message = $msg({to: data.jid[index], "type": "chat"})
            .c('body').t(body).up()
            .c('active', {xmlns: "http://jabber.org/protocol/chatstates"});

        Chat.connection.send(message);
*/
    });
});