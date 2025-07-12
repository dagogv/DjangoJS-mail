
const LOAD_DEFAULT_MAILBOX = 'inbox';

document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // By default, load the inbox
  load_mailbox('inbox');

});


function compose_email() {
  new_email();

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';

  // new_email();
  document.querySelector('#compose-form').onsubmit = function(e) {
    post_msg();
  };
}

function reply_email(contents) {
  new_email();

  // Fill in reply fields
  document.querySelector('#compose-recipients').value = contents.sender;
  let subject_str = contents.subject.slice(0,3).toLowerCase() != "re:" ? `Re: ${contents.subject}` : contents.subject;
  document.querySelector('#compose-subject').value = subject_str;
  document.querySelector('#compose-body').style.fontSize = "small";
  document.querySelector('#compose-body').value = `\n\n"On ${contents.timestamp} ${contents.sender} wrote:"\n ${contents.body}`;
  
  // new_email();
  document.querySelector('#compose-form').onsubmit = function(e) {
    post_msg();
  };
}

function new_email() {

  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  if (document.querySelector('#view-email')) {    // clean traces of viewed single email
    document.querySelector('#view-email').remove()
  }

  // mejor llamar a reply_mail() y compose_mail() aqui
  // despues de cargar #compose-view

  // document.querySelector('#compose-form').onsubmit = function(e) {
  //   post_msg();
  // };
}

async function post_msg() {

    // Operations on submit from compose/reply form
    body = document.querySelector('#compose-body').value;
    recpnts = document.querySelector('#compose-recipients').value;
    sub = document.querySelector('#compose-subject').value;

    // console.log(sub);
       
    const compose_resp = await fetch("/emails", {
      method: "POST", 
      headers: {"Content-type": "application/json"}, 
      body: JSON.stringify({"subject": sub, "body": body, "recipients": recpnts})
    })
    .then(resp => resp.json())
    .then(data => {console.log(data)});

    // json_resp = JSON.parse(compose_resp);
    // alert(json_resp.error);
    // console.log(json_resp.error);
}


function load_mailbox(mailbox) {
  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  
  if (document.querySelector('#view-email')) {    // clean traces of viewed single email
    document.querySelector('#view-email').remove()
  }

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;
  
  const mailbox_resp = fetch(`/emails/${mailbox}`)
  .then(resp => resp.json())
  .then(emails => {
    console.log(emails);

    // OPCION 1 - Otra opcion, funciona muy bien
    // data.forEach(list_emails); 
    // OPCION 2
    for (const email in emails) {
      list_emails(emails[email], mailbox);  
    }
  });

  // json_resp = JSON.parse(mailbox_resp);
  // alert(json_resp.error);
  // console.log(json_resp.error);
}

// OPCION 1
// function list_emails(contents) {
// OPCION 2
function list_emails(contents, mailbox) {
  let email = document.createElement("div");
  email.className = "email-list";
  document.querySelector("#emails-view").append(email);
  
  let idtxt = contents.id;
  let id = document.createElement("div");
  id.setAttribute("hidden", "");
  id.innerHTML = idtxt;
  
  let subjecttxt = contents.subject;
  let subject = document.createElement("div");
  subject.className = "subject";
  subject.innerHTML = subjecttxt;
  
  let timestamptxt = contents.timestamp;
  let timestamp = document.createElement("div");
  timestamp.className = "timestamp";
  timestamp.innerHTML = timestamptxt;


  let sender_recipientstxt = mailbox === 'sent' ? contents.recipients : contents.sender;
  let sender_recipients = document.createElement("p");
  sender_recipients.className = "sender";
  sender_recipients.innerHTML = sender_recipientstxt;


  email.append(id);
  email.append(subject);
  email.append(timestamp);
  email.append(sender_recipients);
  
  if (contents.read === true || contents.archived === true) {
    background_color = "#dddd";
    email.style.color = "#000";
  }
  else {
    background_color = "white";
  }
  email.style.backgroundColor = background_color;
  email.setAttribute("href", "");
  email.onclick = function() {
    view_email(idtxt, mailbox);
  }

  // const emaillink = document.createElement("a");
  // emaillink.setAttribute("href", "");
  // emaillink.className = "emaillink";
  // emaillink.append(email);
}


function view_email(email_id, mailbox) {

  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';

  const viewemail = document.createElement("div");
  viewemail.id = 'view-email';
  document.body.appendChild(viewemail);

  let email_resp = fetch(`/emails/${email_id}`)
  .then(resp => resp.json())
  .then(data => { 
    load_email_data(data, mailbox) });
}

function load_email_data(contents, mailbox) {

  const email = document.createElement("div");
  email.className = "email-single";
  document.querySelector("#view-email").append(email);
  
  
  let idtxt = contents.id;
  const id = document.createElement("div");
  id.setAttribute("hidden", "");
  // id.innerHTML = idtxt;
  id.innerHTML = contents.id;
 
  const sender = document.createElement("p");
  sender.className = "email-data";
  sender.innerHTML = `<strong>From:</strong> ${contents.sender}`;

  const recipients = document.createElement("p");
  recipients.className = "email-data";
  recipients.innerHTML = `<strong>To:</strong> ${contents.recipients}`;
 
  // let subjecttxt = contents.subject;
  const subject = document.createElement("div");
  subject.className = "email-data";
  // subject.innerHTML = `<strong>Subject:</strong> ${subjecttxt}`;
  subject.innerHTML = `<strong>Subject:</strong> ${contents.subject}`;  

  // let timestamptxt = contents.timestamp;
  const timestamp = document.createElement("div");
  timestamp.className = "email-data";
  // timestamp.innerHTML = `<strong>Timestamp:</strong> ${timestamptxt}`;
  timestamp.innerHTML = `<strong>Timestamp:</strong> ${contents.timestamp}`;

  // let bodytxt = contents.body;
  const body = document.createElement("div");
  body.className = "email-data";
  // body.innerHTML = `${bodytxt}`;
  body.innerHTML = `${contents.body}`;

  const hr = document.createElement("hr");

  email.append(id);
  email.append(sender);
  email.append(recipients);
  email.append(subject);
  email.append(timestamp);
  
  set_reademail(idtxt);
  if (mailbox != 'sent'){
    // Archive/Unarchive button
    const archivebtn = document.createElement("button");
    archivebtn.id = "archive_btn";
    email.append(archivebtn);
    set_archivebtn(contents);

    // Reply button
    const replybtn = document.createElement("button");
    replybtn.id = "reply_btn";
    email.append(replybtn);
    set_replybtn(contents);
  }

  email.append(hr);
  email.append(body);
}


// Background grey on read
async function set_reademail(idtxt)
  {
  const resp = await fetch(`/emails/${idtxt}`, {
    method: "PUT", 
    headers: {"Content-type": "application/json"}, 
    body: JSON.stringify({ "read": true })
  })
  .then(data => {console.log(data)});
}


function set_archivebtn(contents) {
  let archivebtn = document.querySelector('#archive_btn');
  archivebtn.className = "btn btn-sm btn-outline-primary";
  let archivetxt = contents.archived == true ? "Unarchive" : "Archive";
  archivebtn.textContent = archivetxt;
  
  archivebtn.onclick = async function() {
    const resp = await fetch(`/emails/${contents.id}`, {
      method: "PUT", 
      headers: {"Content-type": "application/json"}, 
      body: JSON.stringify({ "archived": !contents.archived })
    })
    .then(data => {console.log(data)});
    load_mailbox(LOAD_DEFAULT_MAILBOX);
  }
}

function set_replybtn(contents) {
  let replybtn = document.querySelector('#reply_btn');
  replybtn.className = "btn btn-sm btn-outline-primary";
  replybtn.textContent = "Reply";
  replybtn.onclick = function() { reply_email(contents); }
}
