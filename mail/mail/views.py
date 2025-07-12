import json
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.http import JsonResponse
from django.shortcuts import HttpResponse, HttpResponseRedirect, render
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt

from .models import User, Email


def index(request):

    # Authenticated users view their inbox
    if request.user.is_authenticated:
        return render(request, "mail/inbox.html")

    # Everyone else is prompted to sign in
    else:
        return HttpResponseRedirect(reverse("login"))


@csrf_exempt
@login_required
def compose(request):

    # Composing a new email must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    # Check recipient emails
    #
    # Pueden haber varios recipientes, separados por comas
    # Debe haber por lo menos uno
    #
    # De la forma, se extraen todos los recipientes uno por uno a una lista
    # y se quitan los espacios al inicio y final
    data = json.loads(request.body)
    emails = [email.strip() for email in data.get("recipients").split(",")]
    if emails == [""]:
        return JsonResponse({
            "error": "At least one recipient required."
        }, status=400)

    # Convert email addresses to users
    #
    # Por cada recipiente en la lista 'emails', 
    # se busca el usuario en el 'User' dataset (model)
    # y este usuario se agrega a la otra lista (recipients)
    #
    # USAR LISTAS LO MENOS POSIBLE, CONSUMEN MEMORIA Y PROCESADOR
    # https://www.geeksforgeeks.org/python-difference-between-list-and-tuple/
    recipients = []
    for email in emails:
        try:
            user = User.objects.get(email=email)
            recipients.append(user)
        except User.DoesNotExist:
            return JsonResponse({
                "error": f"User with email {email} does not exist."
            }, status=400)

    # Get contents of email
    # De la forma, extraemos el titulo y el texto del mensaje
    subject = data.get("subject", "")
    body = data.get("body", "")

    # Create one email for each recipient, plus sender
    #
    # Set items are unordered, unchangeable, and do not allow duplicate values
    # https://stackoverflow.com/questions/2831212/python-sets-vs-lists
    # Sets are significantly faster when it comes to determining 
    # if an object is present in the set
    #
    # Creamos un set, agregamos el usuario actual y la lista de recipientes
    # en un set, ('.add' agrega uno, '.update' agrega varios a la vez)
    # Por cada usuario creamos un email
    # en el ultimo, read, si el usuario es el usuario actual, dejar en True
    # de otra manera, dejar en False
    users = set()
    users.add(request.user)
    users.update(recipients)
    for user in users:
        email = Email(
            user=user,
            sender=request.user,
            subject=subject,
            body=body,
            read=user == request.user
        )
        email.save()
        # agregar todos los recipientes a este email
        for recipient in recipients:
            email.recipients.add(recipient)
        email.save()
    return JsonResponse({"message": f'Email sent successfully - Subject: {subject}, Body: {body}, Recipients: {emails}.'}, status=201)

@login_required
def mailbox(request, mailbox):

    # Filter emails returned based on mailbox
    if mailbox == "inbox":
        emails = Email.objects.filter(
            user=request.user, recipients=request.user, archived=False
        )
    elif mailbox == "sent":
        emails = Email.objects.filter(
            user=request.user, sender=request.user
        )
    elif mailbox == "archive":
        emails = Email.objects.filter(
            user=request.user, recipients=request.user, archived=True
        )
    else:
        return JsonResponse({"error": "Invalid mailbox."}, status=400)

    # Return emails in reverse chronologial order
    #
    # Esto retorna un docuemnto Json con todos los emails
    # Cada email es serializado antes de ser enviado
    # Esto quiere decir que usa la funcion Serialize() en el Model Email
    # para convertir cada email a un Diccionario Json
    emails = emails.order_by("-timestamp").all()
    return JsonResponse([email.serialize() for email in emails], safe=False)


@csrf_exempt
@login_required
def email(request, email_id):

    # Query for requested email
    try:
        email = Email.objects.get(user=request.user, pk=email_id)
    except Email.DoesNotExist:
        return JsonResponse({"error": "Email not found."}, status=404)

    # Return email contents
    #
    # Solo leer el email
    if request.method == "GET":
        return JsonResponse(email.serialize())

    # Update whether email is read or should be archived
    #
    # PUT es como POST pero para hacer UPDATES, no CREATE
    # ver https://www.w3schools.com/tags/ref_httpmethods.asp
    #
    # request.body = The raw HTTP request body as a byte string
    # https://stackoverflow.com/questions/36616309/request-data-in-drf-vs-request-body-in-django
    elif request.method == "PUT":
        data = json.loads(request.body)

        if data.get("read") is not None:
            email.read = data["read"]
        if data.get("archived") is not None:
            email.archived = data["archived"]
            
        email.save()
        return HttpResponse(status=204)

    # Email must be via GET or PUT
    else:
        return JsonResponse({
            "error": "GET or PUT request required."
        }, status=400)


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        email = request.POST["email"]
        password = request.POST["password"]
        user = authenticate(request, username=email, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "mail/login.html", {
                "message": "Invalid email and/or password."
            })
    else:
        return render(request, "mail/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "mail/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(email, email, password)
            user.save()
        except IntegrityError as e:
            print(e)
            return render(request, "mail/register.html", {
                "message": "Email address already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "mail/register.html")
