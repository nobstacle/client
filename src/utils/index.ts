export const linkToFile = async (link: string) => {
  let response = await fetch(link);
  let data = await response.blob();
  let metadata = {
    type: data.type,
  };
  const ext = data.type.split("/")[1];

  let file = new File([data], `image.${ext}`, metadata);

  return file;
};

export function parseLocation(inputString: string) {
  const parts = inputString.split(" - ");

  if (parts.length === 2) {
    const origin = parts[0];
    const destination = parts[1];
    return { origin, destination };
  } else {
    // Handle the case where there are not exactly two parts
    return null;
  }
}

export function surveyAnswerValToColor(val: number) {
  switch (val) {
    case 5:
      return "#03C405";

    case 4:
      return "#0BF70D";

    case 3:
      return "#FFA500";

    case 2:
      return "#ff0000";

    case 1:
      return "#ff0000";

    default:
      return "#ff0000";
  }
}
