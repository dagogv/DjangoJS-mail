from django.contrib import admin
from .models import *

class EmailAdmin(admin.ModelAdmin):
    # Many-to-many no se aceptan aqui
    # asi que solo se pueden ver usando filter_horizontal
    #
    list_display = ("sender", "timestamp", "read", "archived")
    filter_horizontal = ("recipients",)

admin.site.register(Email, EmailAdmin)
admin.site.register(User)
