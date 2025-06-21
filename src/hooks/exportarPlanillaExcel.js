import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import dayjs from "dayjs";
import "dayjs/locale/es";

export const exportarPlanillaExcel = async ({
  data,
  empleado,
  empresa,
  fechaInicio,
  fechaFin,
}) => {
  const turno = data[0]?.turno || "-";

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Hoja de Tiempo");

  const bold = { bold: true };
  const center = { horizontal: "center", vertical: "middle" };

  // Título
  sheet.mergeCells("A1:G2");
  const titleCell = sheet.getCell("A1");
  titleCell.value = `HOJA DE TIEMPO.\n              Empresa:   ${
    empresa || "-"
  }`;
  titleCell.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  titleCell.font = { bold: true, size: 13 };

  // Datos del empleado
  sheet.getCell("B3").value = {
    richText: [
      { text: "Nombre empleado: ", font: {} },
      { text: `${empleado || "-"}`, font: { bold: true } },
    ],
  };

  sheet.getCell("D3").value = "Fecha inicio periodo:  ";
  sheet.getCell("E3").value = `${fechaInicio}`;
  sheet.getCell("E3").font = bold;

  sheet.getCell("F3").value = "Turno:";
  sheet.getCell("G3").value = `${turno}`;
  sheet.getCell("G3").font = bold;

  sheet.getCell("D4").value = "Fecha final periodo:  ";
  sheet.getCell("D4").alignment = { horizontal: "right" };
  sheet.getCell("E4").value = `${fechaFin}`;
  sheet.getCell("E4").font = bold;

  let currentRow = 6;

  // 🔽 1) Ordena por fecha ascendente
  const dataOrdenada = [...data].sort((a, b) =>
    dayjs(a.fecha).diff(dayjs(b.fecha))
  );

  // 🔽 2) Recorre la lista ya ordenada
  dataOrdenada.forEach((registro) => {
    const fechaFormato = dayjs(registro.fecha).format("DD/MM/YYYY");
    const diaSemana = dayjs(registro.fecha).locale("es").format("dddd");

    // Encabezado del día
    sheet.getCell(`A${currentRow}`).value =
      diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
    sheet.getCell(`B${currentRow}`).value = "Descripcion de la actividad";
    sheet.getCell(
      `C${currentRow}`
    ).value = `Hora de entrada: ${registro.hora_entrada}`;
    sheet.getCell(
      `D${currentRow}`
    ).value = `Hora de salida: ${registro.hora_salida}`;
    sheet.getCell(`E${currentRow}`).value = "Hora(s)";
    sheet.getCell(`F${currentRow}`).value = "Job #";
    sheet.getCell(`G${currentRow}`).value = "Class #";
    sheet.getRow(currentRow).font = bold;
    currentRow++;

    // Tareas normales
    let totalHorasNormales = 0;
    (registro.descripcion_tarea?.tareas || []).forEach((t) => {
      const horasValue = parseFloat(t.horas) || 0;
      totalHorasNormales += horasValue;

      sheet.getCell(`A${currentRow}`).value = fechaFormato;
      sheet.mergeCells(`B${currentRow}:D${currentRow}`);
      sheet.getCell(`B${currentRow}`).value = t.descripcion || "-";
      sheet.getCell(`B${currentRow}`).alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: true,
      };
      sheet.getCell(`E${currentRow}`).value = horasValue;
      sheet.getCell(`F${currentRow}`).value = t.job_number || "-";
      sheet.getCell(`G${currentRow}`).value = t.classNumber || "-";
      currentRow++;
    });

    // Total horas normales
    sheet.mergeCells(`D${currentRow}:D${currentRow}`);
    sheet.getCell(`D${currentRow}`).value = "Total horas normales";
    sheet.getCell(`D${currentRow}`).alignment = {
      horizontal: "right",
      vertical: "middle",
    };
    sheet.getCell(`E${currentRow}`).value = totalHorasNormales || 0;
    sheet.getCell(`E${currentRow}`).font = { bold: true };
    currentRow++;

    // Tareas extras
    if (registro.extra_desc) {
      sheet.mergeCells(`A${currentRow}:G${currentRow}`);
      currentRow++;

      // Título
      sheet.mergeCells(`B${currentRow}:D${currentRow}`);
      sheet.getCell(`B${currentRow}`).value = "Tareas extras";
      sheet.getCell(`B${currentRow}`).font = { bold: true };
      sheet.getCell(`B${currentRow}`).alignment = {
        horizontal: "left",
        vertical: "middle",
      };
      currentRow++;

      // Tarea extra
      sheet.getCell(`A${currentRow}`).value = fechaFormato;
      sheet.mergeCells(`B${currentRow}:D${currentRow}`);
      sheet.getCell(`B${currentRow}`).value = registro.extra_desc || "-";
      sheet.getCell(`B${currentRow}`).alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: true,
      };
      sheet.getCell(`E${currentRow}`).value = registro.extra_horas || "-";
      sheet.getCell(`F${currentRow}`).value = registro.extra_job_number || "-";
      sheet.getCell(`G${currentRow}`).value = registro.extra_class || "-";
      currentRow++;

      // Total horas extras
      sheet.mergeCells(`D${currentRow}:D${currentRow}`);
      sheet.getCell(`D${currentRow}`).value = "Total horas extras";
      sheet.getCell(`D${currentRow}`).alignment = {
        horizontal: "right",
        vertical: "middle",
      };
      sheet.getCell(`E${currentRow}`).value = registro.extra_horas || 0;
      sheet.getCell(`E${currentRow}`).font = { bold: true };
      currentRow++;
    }
    currentRow++;
  });

  // 🖊️ Firmas
  const firmaStartRow = currentRow + 1;
  const firmaEndRow = firmaStartRow + 2;
  sheet.mergeCells(`A${firmaStartRow}:G${firmaEndRow}`);
  const firma = sheet.getCell(`A${firmaStartRow}`);
  firma.value =
    "Empleado: ______________________        Supervisor: ______________________        Gerente: ______________________";
  firma.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  firma.font = { bold: true, size: 13 };

  // 📐 Ajustar anchos
  sheet.getColumn(2).width = 40;
  sheet.getColumn(1).width = 18;
  sheet.getColumn(3).width = 35;
  sheet.getColumn(4).width = 35;
  sheet.getColumn(5).width = 12;
  sheet.getColumn(6).width = 15;
  sheet.getColumn(7).width = 15;

  sheet.eachRow((row) => (row.alignment = center));

  // Bordes negros para todo el Excel (A-G, todas las filas)
  sheet.eachRow((row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `Hoja_de_Tiempo_${empleado}_${fechaInicio}_a_${fechaFin}.xlsx`);
};
