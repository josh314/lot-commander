import {
  PageHeader,
  SectionHeader,
  SubsectionHeader,
  Button,
  Table,
  TableRow,
  TableHeader,
  TextInput,
  NumberInput,
  Select,
  Surface,
} from '../../components/ui/'
import {
  X
} from 'lucide-react'
import { semanticColors, buttonSizes } from '../../style'

function HeaderSection() {
  return (
    <div className="mb-4">
      <p className="mb-4">This section showcases the different header styles used throughout the application.</p>
      <PageHeader title="PageHeader Example" subtitle="This is an example of a page header with a subtitle." />
      <SectionHeader title="SectionHeader Example"/>
      <SubsectionHeader title="SubsectionHeader Example"/>
    </div>
  )
}

function ButtonGroup( { title, children }: { title: string, children: React.ReactNode } ) {
  return (
    <div className="mb-4">
      <SubsectionHeader title={title}/>
      <div className="flex flex-wrap items-center gap-4">
        {children}
      </div>
    </div>
  )
}

function ButtonSection() {
  return (
    <div>
      <SectionHeader title="Buttons"/>
      <ButtonGroup
        title="Colors"
        children={semanticColors.map((color) => (
          <Button key={color} color={color}>
            {color.charAt(0).toUpperCase() + color.slice(1)}
          </Button>
        ))}
      />
      <ButtonGroup
        title="Sizes"
        children={buttonSizes.map((size) => (
          <Button key={size} color="primary" size={size}>
            Button - {size}
          </Button>
        ))}
      />
    </div>
  )
}

export function TableSection() {

  const headerData = ["Name", "Age", "Email", undefined]

  const data = [
    ["John Doe", 30, "john@example.com", <Button key="john" color="danger" size="xs"><X size={16}/></Button>],
    ["Jane Smith", 25, "jane@example.com", <Button key="jane" color="danger" size="xs"><X size={16}/></Button>],
    ["Bob Johnson", 40, "bob@example.com", <Button key="bob" color="danger" size="xs"><X size={16}/></Button>],
  ]

  const header = <TableHeader cells={headerData} />

  const rows = data.map((row, index) => (
    <TableRow key={index} cells={row} />
  ))

  return (
    <div>
      <SectionHeader title="Tables"/>
      <Table header={ header } rows={ rows } />
    </div>
  )
}

export function InputSection() {
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Inputs" />
      <TextInput placeholder="Placeholder text" label="Text"/>
      <NumberInput placeholder="##" label="Number" />
      <Select label="Select">
        <option value="option1">Option 1</option>
        <option value="option2">Option 2</option>
        <option value="option3">Option 3</option>
      </Select>
    </div>
  )
}

export function StyleGuide() {
  return (
    <>
      <div>
        <PageHeader title="Style Guide" subtitle="A collection of UI components and their variations (Development build only)" />
      </div>
      <hr/>
      <HeaderSection />
      <hr/>
      <ButtonSection />
      <hr/>
      <InputSection />
      <hr/>
      <TableSection />
      <hr/>
      <Surface>
        <p>Voluptatem minima exercitationem corrupti enim est voluptates. Provident quos ea officiis modi. Eius voluptatem quibusdam voluptatem quisquam eius accusamus qui. Tenetur assumenda soluta qui. Aliquam velit molestiae sapiente hic.</p>

        <p>Hic autem unde hic placeat. Ut suscipit sunt et ipsam rerum necessitatibus nemo minus. Est ea rerum nesciunt voluptatibus laudantium fugiat quibusdam. Tempora ut commodi ea animi. Commodi ea debitis omnis qui laborum vero.</p>

        <p>Nesciunt aut culpa aliquam. Et quasi id et maxime doloremque. Dicta ipsum quae non maiores. Aut minus ducimus id.</p>

        <p>Sunt est reiciendis earum omnis provident quae. Dolorum ut est rem dolores aliquid. Voluptatem officiis aut ut non perferendis. Fugit animi quibusdam qui est inventore. Ea non sint molestiae aut eius. Placeat nulla voluptatem architecto veniam.</p>

        <p>Suscipit voluptatem nostrum velit quas aut quo. Voluptatem ipsam consequatur deserunt et non. Dolore impedit in voluptate et dolore non dolore.</p>
      </Surface>
    </>
  )
}