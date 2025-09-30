import { useState } from "react";

export interface ValidationErrors {
  [key: string]: string;
}

export const useEmpleadoValidation = (isEditing: boolean) => {
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});

  const validateField = (name: string, value: any): string | null => {
    // Validaciones que coinciden con empleado.validator.ts
    switch (name) {
      case "nombre":
        if (!value || value.trim().length === 0) return "Nombre es requerido";
        if (value.length > 100)
          return "Nombre no puede tener más de 100 caracteres";
        break;
      case "apellido":
        if (value && value.length > 100)
          return "Apellido no puede tener más de 100 caracteres";
        break;
      case "nombreUsuario":
        if (!value || value.trim().length === 0)
          return "Nombre de usuario es requerido";
        if (value.length < 3)
          return "Nombre de usuario debe tener al menos 3 caracteres";
        if (value.length > 15)
          return "Nombre de usuario no puede tener más de 15 caracteres";
        break;
      case "correoElectronico":
        // Correo es opcional ahora
        if (value && value.trim().length > 0) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value))
            return "Formato de correo electrónico inválido";
        }
        break;
      case "dni":
        if (value && value.length > 45)
          return "DNI no puede tener más de 45 caracteres";
        break;
      case "profesion":
        if (value && value.length > 30)
          return "Profesión no puede tener más de 30 caracteres";
        break;
      case "cargo":
        if (value && value.length > 30)
          return "Cargo no puede tener más de 30 caracteres";
        break;
      case "sueldoMensual":
        if (value && (isNaN(value) || value < 0))
          return "Sueldo debe ser un número positivo";
        break;
      case "condicionSalud":
        if (value && value.length > 50)
          return "Condición de salud no puede tener más de 50 caracteres";
        break;
      case "nombreContactoEmergencia":
        if (value && value.length > 40)
          return "Nombre de contacto no puede tener más de 40 caracteres";
        break;
      case "numeroContactoEmergencia":
        if (value && value.length > 20)
          return "Número de contacto no puede tener más de 20 caracteres";
        break;
      case "banco":
        if (value && value.length > 25)
          return "Banco no puede tener más de 25 caracteres";
        break;
      case "numeroCuenta":
        if (value && value.length > 20)
          return "Número de cuenta no puede tener más de 20 caracteres";
        break;
      case "muerteBeneficiario":
        if (value && value.length > 40)
          return "Beneficiario no puede tener más de 40 caracteres";
        break;
      case "nombreMadre":
        if (value && value.length > 40)
          return "Nombre de la madre no puede tener más de 40 caracteres";
        break;
      case "nombrePadre":
        if (value && value.length > 40)
          return "Nombre del padre no puede tener más de 40 caracteres";
        break;
      case "telefono":
        if (value && value.length > 45)
          return "Teléfono no puede tener más de 45 caracteres";
        break;
      case "direccion":
        if (value && value.length > 250)
          return "Dirección no puede tener más de 250 caracteres";
        break;
      case "nombreConyugue":
        if (value && value.length > 40)
          return "Nombre del cónyuge no puede tener más de 40 caracteres";
        break;
      case "contrasena":
        if (!isEditing) {
          if (!value || value.trim().length === 0)
            return "Contraseña es requerida";
          if (value.length < 6)
            return "Contraseña debe tener al menos 6 caracteres";
        }
        break;
      case "tipoHorario":
        if (!value) return "Tipo de horario es requerido";
        break;
      case "tipoContrato":
        if (!value) return "Tipo de contrato es requerido";
        break;
      case "rolId":
        if (!value) return "Rol es requerido";
        break;
      case "departamentoId":
        if (!value) return "Departamento es requerido";
        break;
    }
    return null;
  };

  const validateForm = (formData: any): ValidationErrors => {
    const errors: ValidationErrors = {};

    // Validar todos los campos
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, (formData as any)[key]);
      if (error) {
        errors[key] = error;
      }
    });

    return errors;
  };

  const validateAndSetError = (name: string, value: any) => {
    const error = validateField(name, value);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: error || "",
    }));
    return error;
  };

  const clearErrors = () => {
    setFieldErrors({});
  };

  const hasErrors = () => {
    return Object.keys(fieldErrors).some((key) => fieldErrors[key]);
  };

  return {
    fieldErrors,
    setFieldErrors,
    validateField,
    validateForm,
    validateAndSetError,
    clearErrors,
    hasErrors,
  };
};
